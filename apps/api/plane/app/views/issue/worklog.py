# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import uuid
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from plane.app.permissions import ROLE, allow_permission
from plane.app.views.base import BaseAPIView, BaseViewSet
from plane.api.serializers import (
    ActiveTimerSerializer,
    TimerHeartbeatSerializer,
    TimerStartSerializer,
    WorklogCreateSerializer,
    WorklogSerializer,
)
from plane.db.models import ActiveTimer, Issue, IssueAssignee, Workspace, Worklog

TIMER_LEASE_SECONDS = 15


def get_user_active_timers(user, *, for_update=False):
    queryset = ActiveTimer.objects.filter(
        user=user,
        deleted_at__isnull=True,
    )
    if for_update:
        queryset = queryset.select_for_update()

    return list(queryset.select_related("issue", "project", "workspace").order_by("-start_time", "-created_at", "-id"))


def soft_delete_active_timers(active_timers):
    timer_ids = [timer.pk for timer in active_timers]
    if not timer_ids:
        return

    ActiveTimer.objects.filter(pk__in=timer_ids).update(deleted_at=timezone.now())


def finalize_timer(active_timer, *, description=""):
    worklog = active_timer.stop()

    if description:
        worklog.description = description
        worklog.save()

    return worklog


def create_active_timer_lease(active_timer):
    now = timezone.now()
    active_timer.lease_token = uuid.uuid4().hex
    active_timer.lease_expires_at = now + timedelta(seconds=TIMER_LEASE_SECONDS)
    active_timer.last_heartbeat_at = now
    active_timer.save()
    return active_timer.lease_token


def resolve_active_timer(user, *, for_update=False, description=""):
    active_timers = get_user_active_timers(user, for_update=for_update)
    active_timer = active_timers[0] if active_timers else None
    legacy_timers = active_timers[1:] if len(active_timers) > 1 else []

    if active_timer and active_timer.is_lease_expired():
        worklog = finalize_timer(active_timer, description=description)
        soft_delete_active_timers(legacy_timers)
        return None, worklog

    soft_delete_active_timers(legacy_timers)
    return active_timer, None


class WorklogViewSet(BaseViewSet):
    """CRUD for worklog entries on an issue."""

    serializer_class = WorklogSerializer
    model = Worklog

    def get_queryset(self):
        return (
            Worklog.objects.filter(
                workspace__slug=self.kwargs.get("slug"),
                project_id=self.kwargs.get("project_id"),
                issue_id=self.kwargs.get("issue_id"),
                deleted_at__isnull=True,
            )
            .select_related("user", "issue", "project")
            .order_by("-logged_at")
        )

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def list(self, request, slug, project_id, issue_id):
        worklogs = self.get_queryset()
        serializer = WorklogSerializer(worklogs, many=True)

        total_minutes = sum(w.duration for w in worklogs)
        hours = total_minutes // 60
        minutes = total_minutes % 60

        return Response(
            {
                "results": serializer.data,
                "total_duration": total_minutes,
                "total_display": f"{hours}h {minutes}m" if hours else f"{minutes}m",
            },
            status=status.HTTP_200_OK,
        )

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def create(self, request, slug, project_id, issue_id):
        serializer = WorklogCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        workspace = Workspace.objects.get(slug=slug)

        worklog = Worklog.objects.create(
            workspace=workspace,
            project_id=project_id,
            issue_id=issue_id,
            user=request.user,
            duration=serializer.validated_data["duration"],
            description=serializer.validated_data.get("description", ""),
            logged_at=serializer.validated_data.get("logged_at", timezone.now()),
            source="manual",
            created_by=request.user,
        )

        return Response(
            WorklogSerializer(worklog).data,
            status=status.HTTP_201_CREATED,
        )

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def partial_update(self, request, slug, project_id, issue_id, pk):
        worklog = self.get_queryset().filter(pk=pk, user=request.user).first()
        if not worklog:
            return Response(
                {"error": "Worklog not found or not yours"},
                status=status.HTTP_404_NOT_FOUND,
            )

        hours = request.data.get("hours")
        minutes = request.data.get("minutes")
        if hours is not None or minutes is not None:
            h = int(hours) if hours is not None else worklog.duration // 60
            m = int(minutes) if minutes is not None else worklog.duration % 60
            total = h * 60 + m
            if total < 1:
                return Response(
                    {"error": "Duration must be at least 1 minute"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            worklog.duration = total

        if "description" in request.data:
            worklog.description = request.data["description"]

        if "logged_at" in request.data:
            worklog.logged_at = request.data["logged_at"]

        worklog.updated_by = request.user
        worklog.save()

        return Response(
            WorklogSerializer(worklog).data,
            status=status.HTTP_200_OK,
        )

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def destroy(self, request, slug, project_id, issue_id, pk):
        worklog = self.get_queryset().filter(pk=pk, user=request.user).first()
        if not worklog:
            return Response(
                {"error": "Worklog not found or not yours"},
                status=status.HTTP_404_NOT_FOUND,
            )
        worklog.deleted_at = timezone.now()
        worklog.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TimerStartEndpoint(BaseAPIView):
    """Start a timer on an issue. Auto-stops any running timer."""

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def post(self, request, slug):
        serializer = TimerStartSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        workspace = Workspace.objects.get(slug=slug)
        issue_id = serializer.validated_data["issue_id"]
        project_id = serializer.validated_data["project_id"]

        try:
            issue = Issue.objects.get(
                id=issue_id,
                project_id=project_id,
                workspace=workspace,
                deleted_at__isnull=True,
            )
        except Issue.DoesNotExist:
            return Response(
                {"error": "Issue not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not IssueAssignee.objects.filter(issue=issue, assignee=request.user).exists():
            return Response(
                {"error": "Only assignees can start a timer on this issue"},
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            active_timer, stopped_worklog = resolve_active_timer(request.user, for_update=True)

            if active_timer:
                stopped_worklog = active_timer.stop()

            active_timer = ActiveTimer.objects.create(
                workspace=workspace,
                project_id=project_id,
                issue_id=issue_id,
                user=request.user,
                start_time=timezone.now(),
                lease_token="",
                lease_expires_at=None,
                last_heartbeat_at=None,
                created_by=request.user,
            )
            lease_token = create_active_timer_lease(active_timer)

        response_data = {
            "active_timer": ActiveTimerSerializer(active_timer).data,
            "lease_token": lease_token,
        }
        if stopped_worklog:
            response_data["stopped_worklog"] = WorklogSerializer(stopped_worklog).data

        return Response(response_data, status=status.HTTP_201_CREATED)


class TimerStopEndpoint(BaseAPIView):
    """Stop the current running timer and create a worklog entry."""

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def post(self, request, slug):
        Workspace.objects.get(slug=slug)
        description = request.data.get("description", "")

        with transaction.atomic():
            active_timer, expired_worklog = resolve_active_timer(
                request.user,
                for_update=True,
                description=description,
            )

            if expired_worklog:
                return Response(
                    WorklogSerializer(expired_worklog).data,
                    status=status.HTTP_200_OK,
                )

            if not active_timer:
                return Response(
                    {"error": "No active timer found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            worklog = finalize_timer(active_timer, description=description)

        return Response(
            WorklogSerializer(worklog).data,
            status=status.HTTP_200_OK,
        )


class TimerActiveEndpoint(BaseAPIView):
    """Get the currently running timer for the authenticated user."""

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def get(self, request, slug):
        Workspace.objects.get(slug=slug)

        with transaction.atomic():
            active_timer, expired_worklog = resolve_active_timer(request.user, for_update=True)

        if expired_worklog:
            return Response(
                {"active_timer": None},
                status=status.HTTP_200_OK,
            )

        if not active_timer:
            return Response(
                {"active_timer": None},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"active_timer": ActiveTimerSerializer(active_timer).data},
            status=status.HTTP_200_OK,
        )


class TimerDiscardEndpoint(BaseAPIView):
    """Discard the current timer without creating a worklog."""

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def post(self, request, slug):
        Workspace.objects.get(slug=slug)

        with transaction.atomic():
            active_timer, expired_worklog = resolve_active_timer(request.user, for_update=True)

            if expired_worklog:
                return Response(
                    {"message": "Timer discarded"},
                    status=status.HTTP_200_OK,
                )

            if not active_timer:
                return Response(
                    {"error": "No active timer found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            active_timer.deleted_at = timezone.now()
            active_timer.save()

        return Response(
            {"message": "Timer discarded"},
            status=status.HTTP_200_OK,
        )


class TimerHeartbeatEndpoint(BaseAPIView):
    """Renew the lease for the current active timer."""

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def post(self, request, slug):
        Workspace.objects.get(slug=slug)

        serializer = TimerHeartbeatSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        lease_token = serializer.validated_data["lease_token"]

        with transaction.atomic():
            active_timer, expired_worklog = resolve_active_timer(request.user, for_update=True)

            if expired_worklog:
                return Response(
                    {"error": "Timer lease expired"},
                    status=status.HTTP_410_GONE,
                )

            if not active_timer:
                return Response(
                    {"error": "No active timer found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if active_timer.lease_token != lease_token:
                return Response(
                    {"error": "Timer lease no longer owned by this client"},
                    status=status.HTTP_409_CONFLICT,
                )

            now = timezone.now()
            active_timer.lease_expires_at = now + timedelta(seconds=TIMER_LEASE_SECONDS)
            active_timer.last_heartbeat_at = now
            active_timer.save()

        return Response(
            {"active_timer": ActiveTimerSerializer(active_timer).data},
            status=status.HTTP_200_OK,
        )

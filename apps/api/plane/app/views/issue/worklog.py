# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.utils import timezone
from rest_framework.response import Response
from rest_framework import status

from plane.app.views.base import BaseViewSet, BaseAPIView
from plane.app.permissions import allow_permission, ROLE
from plane.api.serializers import (
    WorklogSerializer,
    WorklogCreateSerializer,
    ActiveTimerSerializer,
    TimerStartSerializer,
)
from plane.db.models import Worklog, ActiveTimer, Issue, Project, Workspace


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

        # Calculate total duration
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

        # Allow updating duration via hours/minutes
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

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def post(self, request, slug):
        serializer = TimerStartSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        workspace = Workspace.objects.get(slug=slug)
        issue_id = serializer.validated_data["issue_id"]
        project_id = serializer.validated_data["project_id"]

        # Validate issue exists
        try:
            issue = Issue.objects.get(
                id=issue_id, project_id=project_id, deleted_at__isnull=True
            )
        except Issue.DoesNotExist:
            return Response(
                {"error": "Issue not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Auto-stop any running timer for this user in this workspace
        existing = ActiveTimer.objects.filter(
            user=request.user,
            workspace=workspace,
            deleted_at__isnull=True,
        ).first()

        stopped_worklog = None
        if existing:
            stopped_worklog = existing.stop()

        # Create new active timer
        active_timer = ActiveTimer.objects.create(
            workspace=workspace,
            project_id=project_id,
            issue_id=issue_id,
            user=request.user,
            start_time=timezone.now(),
            created_by=request.user,
        )

        response_data = {
            "active_timer": ActiveTimerSerializer(active_timer).data,
        }
        if stopped_worklog:
            response_data["stopped_worklog"] = WorklogSerializer(stopped_worklog).data

        return Response(response_data, status=status.HTTP_201_CREATED)


class TimerStopEndpoint(BaseAPIView):
    """Stop the current running timer and create a worklog entry."""

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def post(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)

        active_timer = ActiveTimer.objects.filter(
            user=request.user,
            workspace=workspace,
            deleted_at__isnull=True,
        ).first()

        if not active_timer:
            return Response(
                {"error": "No active timer found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Stop the timer — creates a worklog
        worklog = active_timer.stop()

        # Optionally add description from request
        description = request.data.get("description", "")
        if description:
            worklog.description = description
            worklog.save()

        return Response(
            WorklogSerializer(worklog).data,
            status=status.HTTP_200_OK,
        )


class TimerActiveEndpoint(BaseAPIView):
    """Get the currently running timer for the authenticated user."""

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def get(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)

        active_timer = ActiveTimer.objects.filter(
            user=request.user,
            workspace=workspace,
            deleted_at__isnull=True,
        ).select_related("issue", "project").first()

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

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def post(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)

        active_timer = ActiveTimer.objects.filter(
            user=request.user,
            workspace=workspace,
            deleted_at__isnull=True,
        ).first()

        if not active_timer:
            return Response(
                {"error": "No active timer found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Just delete the timer, don't create a worklog
        active_timer.deleted_at = timezone.now()
        active_timer.save()

        return Response(
            {"message": "Timer discarded"},
            status=status.HTTP_200_OK,
        )

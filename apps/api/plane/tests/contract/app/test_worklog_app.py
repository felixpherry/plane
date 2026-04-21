# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from datetime import timedelta

import pytest
from rest_framework import status
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from plane.db.models import ActiveTimer, Issue, IssueAssignee, Project, State, Worklog, Workspace, WorkspaceMember


def build_project_issue(workspace, user, *, project_name: str, project_identifier: str, issue_name: str):
    project = Project.objects.create(
        name=project_name,
        identifier=project_identifier,
        workspace=workspace,
        created_by=user,
    )

    state = State.objects.create(
        name="Todo",
        project=project,
        color="#60646C",
        group="backlog",
        default=True,
        created_by=user,
    )

    issue = Issue.objects.create(
        name=issue_name,
        workspace=workspace,
        project=project,
        state=state,
        created_by=user,
    )

    IssueAssignee.objects.create(issue=issue, assignee=user, created_by=user)

    return project, issue


@pytest.mark.contract
class TestWorklogTimerAPI:
    @pytest.mark.django_db
    def test_start_timer_switches_globally_across_workspaces(self, session_client, create_user, workspace):
        workspace_b = Workspace.objects.create(
            name="Workspace B",
            slug="workspace-b",
            owner=create_user,
        )
        WorkspaceMember.objects.create(workspace=workspace_b, member=create_user, role=20)

        _, issue_a = build_project_issue(
            workspace,
            create_user,
            project_name="Project A",
            project_identifier="PA",
            issue_name="Issue A",
        )
        _, issue_b = build_project_issue(
            workspace_b,
            create_user,
            project_name="Project B",
            project_identifier="PB",
            issue_name="Issue B",
        )

        start_url_a = f"/api/workspaces/{workspace.slug}/timer/start/"
        start_url_b = f"/api/workspaces/{workspace_b.slug}/timer/start/"
        active_url_a = f"/api/workspaces/{workspace.slug}/timer/active/"
        active_url_b = f"/api/workspaces/{workspace_b.slug}/timer/active/"

        response_a = session_client.post(
            start_url_a,
            {"issue_id": str(issue_a.id), "project_id": str(issue_a.project_id)},
            format="json",
        )
        assert response_a.status_code == status.HTTP_201_CREATED
        assert ActiveTimer.objects.filter(user=create_user, deleted_at__isnull=True).count() == 1

        response_b = session_client.post(
            start_url_b,
            {"issue_id": str(issue_b.id), "project_id": str(issue_b.project_id)},
            format="json",
        )
        assert response_b.status_code == status.HTTP_201_CREATED

        stopped_worklog = response_b.json()["stopped_worklog"]
        assert stopped_worklog["issue"] == str(issue_a.id)
        assert stopped_worklog["workspace"] == str(workspace.id)
        assert stopped_worklog["source"] == "timer"

        assert Worklog.objects.filter(issue=issue_a, user=create_user, source="timer").count() == 1
        assert ActiveTimer.objects.filter(user=create_user, deleted_at__isnull=True).count() == 1

        active_a = session_client.get(active_url_a)
        active_b = session_client.get(active_url_b)
        assert active_a.status_code == status.HTTP_200_OK
        assert active_b.status_code == status.HTTP_200_OK

        active_timer_a = active_a.json()["active_timer"]
        active_timer_b = active_b.json()["active_timer"]
        assert active_timer_a["id"] == active_timer_b["id"]
        assert active_timer_a["issue"] == str(issue_b.id)
        assert active_timer_a["workspace"] == str(workspace_b.id)

    @pytest.mark.django_db
    def test_stop_and_discard_timer_ignore_route_workspace(self, session_client, create_user, workspace):
        workspace_b = Workspace.objects.create(
            name="Workspace B",
            slug="workspace-b",
            owner=create_user,
        )
        WorkspaceMember.objects.create(workspace=workspace_b, member=create_user, role=20)

        _, issue_a = build_project_issue(
            workspace,
            create_user,
            project_name="Project A",
            project_identifier="PA",
            issue_name="Issue A",
        )
        _, issue_b = build_project_issue(
            workspace_b,
            create_user,
            project_name="Project B",
            project_identifier="PB",
            issue_name="Issue B",
        )

        start_url_a = f"/api/workspaces/{workspace.slug}/timer/start/"
        start_url_b = f"/api/workspaces/{workspace_b.slug}/timer/start/"
        stop_url_b = f"/api/workspaces/{workspace_b.slug}/timer/stop/"
        discard_url_b = f"/api/workspaces/{workspace_b.slug}/timer/discard/"

        start_response = session_client.post(
            start_url_a,
            {"issue_id": str(issue_a.id), "project_id": str(issue_a.project_id)},
            format="json",
        )
        assert start_response.status_code == status.HTTP_201_CREATED

        stop_response = session_client.post(stop_url_b, {"description": "Stopped elsewhere"}, format="json")
        assert stop_response.status_code == status.HTTP_200_OK
        stopped_worklog = stop_response.json()
        assert stopped_worklog["issue"] == str(issue_a.id)
        assert stopped_worklog["workspace"] == str(workspace.id)
        assert stopped_worklog["description"] == "Stopped elsewhere"

        assert ActiveTimer.objects.filter(user=create_user, deleted_at__isnull=True).count() == 0

        session_client.post(
            start_url_b,
            {"issue_id": str(issue_b.id), "project_id": str(issue_b.project_id)},
            format="json",
        )

        discard_response = session_client.post(discard_url_b, {}, format="json")
        assert discard_response.status_code == status.HTTP_200_OK
        assert ActiveTimer.objects.filter(user=create_user, deleted_at__isnull=True).count() == 0

    @pytest.mark.django_db
    def test_get_active_finalizes_expired_timer(self, session_client, create_user, workspace):
        _, issue = build_project_issue(
            workspace,
            create_user,
            project_name="Project A",
            project_identifier="PA",
            issue_name="Issue A",
        )

        start_url = f"/api/workspaces/{workspace.slug}/timer/start/"
        active_url = f"/api/workspaces/{workspace.slug}/timer/active/"

        start_response = session_client.post(
            start_url,
            {"issue_id": str(issue.id), "project_id": str(issue.project_id)},
            format="json",
        )
        assert start_response.status_code == status.HTTP_201_CREATED

        ActiveTimer.objects.filter(user=create_user, deleted_at__isnull=True).update(
            lease_expires_at=timezone.now() - timedelta(seconds=1),
        )

        active_response = session_client.get(active_url)
        assert active_response.status_code == status.HTTP_200_OK
        assert active_response.json()["active_timer"] is None
        assert ActiveTimer.objects.filter(user=create_user, deleted_at__isnull=True).count() == 0
        assert Worklog.objects.filter(issue=issue, user=create_user, source="timer").count() == 1

    @pytest.mark.django_db
    def test_start_timer_finalizes_expired_timer_before_creating_new_one(self, session_client, create_user, workspace):
        _, issue_a = build_project_issue(
            workspace,
            create_user,
            project_name="Project A",
            project_identifier="PA",
            issue_name="Issue A",
        )
        _, issue_b = build_project_issue(
            workspace,
            create_user,
            project_name="Project B",
            project_identifier="PB",
            issue_name="Issue B",
        )

        start_url = f"/api/workspaces/{workspace.slug}/timer/start/"

        first_start = session_client.post(
            start_url,
            {"issue_id": str(issue_a.id), "project_id": str(issue_a.project_id)},
            format="json",
        )
        assert first_start.status_code == status.HTTP_201_CREATED

        ActiveTimer.objects.filter(user=create_user, deleted_at__isnull=True).update(
            lease_expires_at=timezone.now() - timedelta(seconds=1),
        )

        second_start = session_client.post(
            start_url,
            {"issue_id": str(issue_b.id), "project_id": str(issue_b.project_id)},
            format="json",
        )
        assert second_start.status_code == status.HTTP_201_CREATED

        response_data = second_start.json()
        assert response_data["stopped_worklog"]["issue"] == str(issue_a.id)
        assert response_data["active_timer"]["issue"] == str(issue_b.id)
        assert ActiveTimer.objects.filter(user=create_user, deleted_at__isnull=True).count() == 1

    @pytest.mark.django_db
    def test_timer_heartbeat_requires_matching_lease_token(self, session_client, create_user, workspace):
        _, issue = build_project_issue(
            workspace,
            create_user,
            project_name="Project A",
            project_identifier="PA",
            issue_name="Issue A",
        )

        start_url = f"/api/workspaces/{workspace.slug}/timer/start/"
        heartbeat_url = f"/api/workspaces/{workspace.slug}/timer/heartbeat/"

        start_response = session_client.post(
            start_url,
            {"issue_id": str(issue.id), "project_id": str(issue.project_id)},
            format="json",
        )
        assert start_response.status_code == status.HTTP_201_CREATED

        start_payload = start_response.json()
        lease_token = start_payload["lease_token"]
        start_lease_expires_at = parse_datetime(start_payload["active_timer"]["lease_expires_at"])
        assert start_lease_expires_at is not None
        assert 570 <= (start_lease_expires_at - timezone.now()).total_seconds() <= 600

        rejected_response = session_client.post(
            heartbeat_url,
            {"lease_token": "wrong-token"},
            format="json",
        )
        assert rejected_response.status_code == status.HTTP_409_CONFLICT

        accepted_response = session_client.post(
            heartbeat_url,
            {"lease_token": lease_token},
            format="json",
        )
        assert accepted_response.status_code == status.HTTP_200_OK
        accepted_payload = accepted_response.json()
        assert accepted_payload["active_timer"]["issue"] == str(issue.id)
        heartbeat_lease_expires_at = parse_datetime(accepted_payload["active_timer"]["lease_expires_at"])
        assert heartbeat_lease_expires_at is not None
        assert 570 <= (heartbeat_lease_expires_at - timezone.now()).total_seconds() <= 600
        assert ActiveTimer.objects.filter(user=create_user, deleted_at__isnull=True).count() == 1

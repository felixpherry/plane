# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest
from rest_framework import status

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

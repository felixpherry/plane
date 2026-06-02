# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest
from rest_framework import status

from plane.db.models import Issue, Project, ProjectMember, State, User, WorkspaceMember


ROLE_MEMBER = 15


def build_project(workspace, user, *, name, identifier, state_group):
    project = Project.objects.create(name=name, identifier=identifier, workspace=workspace, created_by=user)
    state = State.objects.create(
        name=f"{name} state",
        project=project,
        color="#60646C",
        group=state_group,
        default=True,
        created_by=user,
    )
    ProjectMember.objects.create(project=project, member=user, role=ROLE_MEMBER, is_active=True)
    return project, state


@pytest.mark.contract
class TestWorkspaceViewIssuesAPI:
    @pytest.mark.django_db
    def test_workspace_issues_support_group_by_state_group(self, session_client, workspace, create_user):
        project_a, backlog_state = build_project(
            workspace, create_user, name="Alpha", identifier="ALP", state_group="backlog"
        )
        project_b, started_state = build_project(
            workspace, create_user, name="Beta", identifier="BET", state_group="started"
        )

        backlog_issue = Issue.objects.create(
            name="Backlog item",
            workspace=workspace,
            project=project_a,
            state=backlog_state,
            created_by=create_user,
        )
        started_issue = Issue.objects.create(
            name="Started item",
            workspace=workspace,
            project=project_b,
            state=started_state,
            created_by=create_user,
        )

        response = session_client.get(
            f"/api/workspaces/{workspace.slug}/issues/",
            {"group_by": "state__group", "per_page": 20},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["grouped_by"] == "state__group"
        assert response.data["results"]["backlog"]["total_results"] == 1
        assert response.data["results"]["started"]["total_results"] == 1
        assert response.data["results"]["backlog"]["results"][0]["id"] == str(backlog_issue.id)
        assert response.data["results"]["started"]["results"][0]["id"] == str(started_issue.id)

    @pytest.mark.django_db
    def test_workspace_issues_support_group_by_assignee(self, session_client, workspace, create_user):
        project, state = build_project(workspace, create_user, name="Alpha", identifier="ALP", state_group="started")
        teammate = User.objects.create(email="teammate@plane.so", first_name="Team", last_name="Mate")
        WorkspaceMember.objects.create(workspace=workspace, member=teammate, role=ROLE_MEMBER, is_active=True)
        ProjectMember.objects.create(project=project, member=teammate, role=ROLE_MEMBER, is_active=True)

        multi_assignee_issue = Issue.objects.create(
            name="Shared schedule",
            workspace=workspace,
            project=project,
            state=state,
            created_by=create_user,
        )
        multi_assignee_issue.assignees.add(create_user, teammate)

        response = session_client.get(
            f"/api/workspaces/{workspace.slug}/issues/",
            {"group_by": "assignees__id", "per_page": 20},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["grouped_by"] == "assignees__id"
        assert response.data["results"][str(create_user.id)]["total_results"] == 1
        assert response.data["results"][str(teammate.id)]["total_results"] == 1
        assert response.data["results"][str(create_user.id)]["results"][0]["id"] == str(multi_assignee_issue.id)
        assert response.data["results"][str(teammate.id)]["results"][0]["id"] == str(multi_assignee_issue.id)

    @pytest.mark.django_db
    def test_workspace_issues_reject_unsupported_group_by(self, session_client, workspace, create_user):
        project, state = build_project(
            workspace, create_user, name="Alpha", identifier="ALP", state_group="backlog"
        )
        Issue.objects.create(
            name="Backlog item", workspace=workspace, project=project, state=state, created_by=create_user
        )

        response = session_client.get(
            f"/api/workspaces/{workspace.slug}/issues/",
            {"group_by": "state_id", "per_page": 20},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {"error": "Unsupported workspace group_by: state_id"}

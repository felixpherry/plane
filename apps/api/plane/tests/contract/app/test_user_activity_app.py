# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from plane.db.models import Issue, IssueActivity, IssueAssignee, Project, State, Worklog


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
class TestUserActivityAPI:
    @pytest.mark.django_db
    def test_workspace_user_activity_merges_issue_activities_and_worklogs(self, session_client, create_user, workspace):
        project, issue = build_project_issue(
            workspace,
            create_user,
            project_name="Project A",
            project_identifier="PA",
            issue_name="Issue A",
        )

        issue_activity = IssueActivity.objects.create(
            workspace=workspace,
            project=project,
            issue=issue,
            actor=create_user,
            verb="updated",
            field="state",
            old_value="Todo",
            new_value="In Progress",
            created_by=create_user,
        )
        worklog = Worklog.objects.create(
            workspace=workspace,
            project=project,
            issue=issue,
            user=create_user,
            duration=90,
            description="Payroll adjustments",
            source="manual",
            created_by=create_user,
        )
        deleted_worklog = Worklog.objects.create(
            workspace=workspace,
            project=project,
            issue=issue,
            user=create_user,
            duration=15,
            description="Should disappear",
            source="manual",
            created_by=create_user,
        )

        IssueActivity.objects.filter(pk=issue_activity.pk).update(created_at=timezone.now() - timedelta(hours=2))
        Worklog.objects.filter(pk=worklog.pk).update(created_at=timezone.now() - timedelta(hours=1))
        Worklog.objects.filter(pk=deleted_worklog.pk).update(
            created_at=timezone.now(),
            deleted_at=timezone.now(),
        )

        response = session_client.get(
            reverse("workspace-user-activity", kwargs={"slug": workspace.slug, "user_id": create_user.id}),
            {"per_page": 10},
        )

        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()

        assert response_data["count"] == 2
        assert [item["activity_kind"] for item in response_data["results"]] == ["worklog", "issue_activity"]

        worklog_item = response_data["results"][0]
        assert worklog_item["actor"] == str(create_user.id)
        assert worklog_item["payload"]["display_duration"] == "1h 30m"
        assert worklog_item["payload"]["description"] == "Payroll adjustments"

        issue_activity_item = response_data["results"][1]
        assert issue_activity_item["payload"]["field"] == "state"
        assert issue_activity_item["payload"]["new_value"] == "In Progress"

    @pytest.mark.django_db
    def test_current_user_activity_merges_issue_activities_and_worklogs(self, session_client, create_user, workspace):
        project, issue = build_project_issue(
            workspace,
            create_user,
            project_name="Project A",
            project_identifier="PA",
            issue_name="Issue A",
        )

        issue_activity = IssueActivity.objects.create(
            workspace=workspace,
            project=project,
            issue=issue,
            actor=create_user,
            verb="created",
            field=None,
            created_by=create_user,
        )
        worklog = Worklog.objects.create(
            workspace=workspace,
            project=project,
            issue=issue,
            user=create_user,
            duration=30,
            description="Logged recently",
            source="timer",
            created_by=create_user,
        )

        IssueActivity.objects.filter(pk=issue_activity.pk).update(created_at=timezone.now() - timedelta(minutes=30))
        Worklog.objects.filter(pk=worklog.pk).update(created_at=timezone.now() - timedelta(minutes=10))

        response = session_client.get(reverse("user-activities"), {"per_page": 10})

        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()

        assert [item["activity_kind"] for item in response_data["results"][:2]] == ["worklog", "issue_activity"]
        assert response_data["results"][0]["payload"]["source"] == "timer"

    @pytest.mark.django_db
    def test_workspace_user_activity_export_includes_worklogs(self, session_client, create_user, workspace):
        project, issue = build_project_issue(
            workspace,
            create_user,
            project_name="Project A",
            project_identifier="PA",
            issue_name="Issue A",
        )

        export_date = timezone.now().date()

        issue_activity = IssueActivity.objects.create(
            workspace=workspace,
            project=project,
            issue=issue,
            actor=create_user,
            verb="updated",
            field="priority",
            old_value="low",
            new_value="high",
            created_by=create_user,
        )
        worklog = Worklog.objects.create(
            workspace=workspace,
            project=project,
            issue=issue,
            user=create_user,
            duration=45,
            description="Exported worklog",
            source="manual",
            created_by=create_user,
        )

        IssueActivity.objects.filter(pk=issue_activity.pk).update(created_at=timezone.now())
        Worklog.objects.filter(pk=worklog.pk).update(created_at=timezone.now())

        response = session_client.post(
            reverse("export-workspace-user-activity", kwargs={"slug": workspace.slug, "user_id": create_user.id}),
            {"date": export_date.isoformat()},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

        csv_data = response.content.decode("utf-8")
        assert "Entry type" in csv_data
        assert "Worklog" in csv_data
        assert "Issue activity" in csv_data
        assert "Exported worklog" in csv_data

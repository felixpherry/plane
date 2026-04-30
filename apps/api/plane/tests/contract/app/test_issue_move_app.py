# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from datetime import date

import pytest
from django.utils import timezone
from rest_framework import status

from plane.db.models import (
    CommentReaction,
    CustomField,
    CustomFieldValue,
    Cycle,
    CycleIssue,
    Estimate,
    EstimatePoint,
    Intake,
    IntakeIssue,
    Issue,
    IssueActivity,
    IssueAssignee,
    IssueAttachment,
    IssueComment,
    IssueLabel,
    IssueLink,
    IssueMention,
    IssueReaction,
    IssueRelation,
    IssueSequence,
    IssueSubscriber,
    IssueType,
    IssueVote,
    Label,
    Module,
    ModuleIssue,
    Page,
    Project,
    ProjectIssueType,
    ProjectMember,
    State,
    User,
    WorkItemPageLink,
    Worklog,
)


ROLE_ADMIN = 20
ROLE_MEMBER = 15
ROLE_GUEST = 5


def build_project(workspace, user, *, name, identifier, role=ROLE_MEMBER):
    project = Project.objects.create(name=name, identifier=identifier, workspace=workspace, created_by=user)
    state = State.objects.create(
        name="Todo",
        project=project,
        color="#60646C",
        group="backlog",
        default=True,
        created_by=user,
    )
    ProjectMember.objects.create(project=project, member=user, role=role, is_active=True)
    return project, state


def move_url(workspace_slug, project_id, issue_id):
    return f"/api/workspaces/{workspace_slug}/projects/{project_id}/issues/{issue_id}/move/"


@pytest.mark.contract
class TestIssueMoveAPI:
    @pytest.mark.django_db
    def test_move_issue_success_preserves_content_and_drops_project_properties(
        self, session_client, workspace, create_user
    ):
        source_project, source_state = build_project(
            workspace, create_user, name="Source", identifier="SRC", role=ROLE_MEMBER
        )
        target_project, target_state = build_project(
            workspace, create_user, name="Target", identifier="TGT", role=ROLE_MEMBER
        )
        _, other_target_state = build_project(
            workspace, create_user, name="Other", identifier="OTH", role=ROLE_MEMBER
        )

        # Seed target sequence so moved work item must get next target sequence, not keep old one.
        Issue.objects.create(name="Existing target issue", workspace=workspace, project=target_project, state=target_state)

        assignee = User.objects.create(email="assignee@example.com", username="assignee")
        ProjectMember.objects.create(project=source_project, member=assignee, role=ROLE_MEMBER, is_active=True)
        label = Label.objects.create(name="Backend", color="#000000", project=source_project, workspace=workspace)
        estimate = Estimate.objects.create(name="Points", project=source_project)
        estimate_point = EstimatePoint.objects.create(estimate=estimate, project=source_project, key=1, value="1")
        parent = Issue.objects.create(name="Parent", workspace=workspace, project=source_project, state=source_state)
        issue_type = IssueType.objects.create(name="Bug", workspace=workspace, is_default=True)
        ProjectIssueType.objects.create(project=source_project, issue_type=issue_type)
        ProjectIssueType.objects.create(project=target_project, issue_type=issue_type)
        issue = Issue.objects.create(
            name="Move me",
            description_html="<p>Keep me</p>",
            workspace=workspace,
            project=source_project,
            state=source_state,
            parent=parent,
            priority="high",
            start_date=date(2024, 1, 1),
            target_date=date(2024, 1, 5),
            estimate_point=estimate_point,
            type=issue_type,
            created_by=create_user,
        )
        old_sequence_id = issue.sequence_id

        IssueAssignee.objects.create(issue=issue, assignee=assignee, project=source_project)
        IssueLabel.objects.create(issue=issue, label=label, project=source_project)
        cycle = Cycle.objects.create(name="Cycle", project=source_project, owned_by=create_user)
        cycle_issue = CycleIssue.objects.create(issue=issue, cycle=cycle, project=source_project)
        module = Module.objects.create(name="Module", project=source_project)
        module_issue = ModuleIssue.objects.create(issue=issue, module=module, project=source_project)
        related_issue = Issue.objects.create(name="Related", workspace=workspace, project=source_project, state=source_state)
        relation = IssueRelation.objects.create(
            issue=issue, related_issue=related_issue, relation_type="relates_to", project=source_project
        )
        reverse_relation = IssueRelation.objects.create(
            issue=related_issue, related_issue=issue, relation_type="blocked_by", project=source_project
        )
        subscriber = IssueSubscriber.objects.create(issue=issue, subscriber=create_user, project=source_project)
        mention = IssueMention.objects.create(issue=issue, mention=create_user, project=source_project)
        custom_field = CustomField.objects.create(name="Risk", field_type="text", project=source_project, workspace=workspace)
        custom_value = CustomFieldValue.objects.create(issue=issue, custom_field=custom_field, project=source_project)
        page = Page.objects.create(name="Spec", workspace=workspace, owned_by=create_user)
        page_link = WorkItemPageLink.objects.create(issue=issue, page=page, project=source_project)

        issue_link = IssueLink.objects.create(issue=issue, url="https://example.com", project=source_project)
        attachment = IssueAttachment.objects.create(issue=issue, asset="attachments/test.txt", project=source_project)
        comment = IssueComment.objects.create(issue=issue, comment_html="<p>Comment</p>", project=source_project)
        activity = IssueActivity.objects.create(issue=issue, verb="created", project=source_project)
        worklog = Worklog.objects.create(issue=issue, user=create_user, project=source_project, duration=30)
        reaction = IssueReaction.objects.create(issue=issue, actor=create_user, reaction="thumbs-up", project=source_project)
        vote = IssueVote.objects.create(issue=issue, actor=create_user, project=source_project)
        comment_reaction = CommentReaction.objects.create(comment=comment, actor=create_user, reaction="eyes", project=source_project)

        response = session_client.post(
            move_url(workspace.slug, source_project.id, issue.id),
            {"target_project_id": str(target_project.id)},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["id"] == str(issue.id)
        assert response_data["project_id"] == str(target_project.id)
        assert response_data["project_identifier"] == target_project.identifier
        assert response_data["sequence_id"] == 2

        issue.refresh_from_db()
        assert issue.project_id == target_project.id
        assert issue.sequence_id == 2
        assert issue.state_id == target_state.id
        assert issue.name == "Move me"
        assert issue.description_html == "<p>Keep me</p>"
        assert issue.type_id == issue_type.id
        assert issue.priority == "none"
        assert issue.start_date is None
        assert issue.target_date is None
        assert issue.estimate_point_id is None
        assert issue.parent_id is None
        assert issue.completed_at is None

        assert IssueSequence.objects.filter(issue=issue, project=target_project, sequence=2).exists()
        assert not Issue.issue_objects.filter(project=source_project, id=issue.id).exists()
        assert Issue.issue_objects.filter(project=target_project, id=issue.id).exists()

        target_detail = session_client.get(f"/api/workspaces/{workspace.slug}/projects/{target_project.id}/issues/{issue.id}/")
        assert target_detail.status_code == status.HTTP_200_OK
        source_list = session_client.get(f"/api/workspaces/{workspace.slug}/projects/{source_project.id}/issues/")
        assert source_list.status_code == status.HTTP_200_OK
        assert str(issue.id) not in str(source_list.json())

        for dropped in [cycle_issue, module_issue, relation, reverse_relation, subscriber, mention, custom_value, page_link]:
            dropped.refresh_from_db()
            assert dropped.deleted_at is not None

        assert not IssueAssignee.objects.filter(issue=issue).exists()
        assert not IssueLabel.objects.filter(issue=issue).exists()

        for preserved in [issue_link, attachment, comment, activity, worklog, reaction, vote, comment_reaction]:
            preserved.refresh_from_db()
            assert preserved.deleted_at is None
            assert preserved.project_id == target_project.id

        assert IssueActivity.objects.filter(
            issue=issue,
            project=target_project,
            verb="moved",
            old_value=f"{source_project.identifier}-{old_sequence_id}",
            new_value=f"{target_project.identifier}-2",
        ).exists()

    @pytest.mark.django_db
    def test_move_issue_replaces_issue_type_when_target_does_not_support_source_type(
        self, session_client, workspace, create_user
    ):
        source_project, source_state = build_project(
            workspace, create_user, name="Source", identifier="SRC", role=ROLE_MEMBER
        )
        target_project, target_state = build_project(
            workspace, create_user, name="Target", identifier="TGT", role=ROLE_MEMBER
        )
        source_type = IssueType.objects.create(name="Source type", workspace=workspace)
        target_type = IssueType.objects.create(name="Target default", workspace=workspace, is_default=True)
        ProjectIssueType.objects.create(project=source_project, issue_type=source_type, is_default=True)
        ProjectIssueType.objects.create(project=target_project, issue_type=target_type, is_default=True)
        issue = Issue.objects.create(
            name="Move me",
            workspace=workspace,
            project=source_project,
            state=source_state,
            type=source_type,
        )

        response = session_client.post(
            move_url(workspace.slug, source_project.id, issue.id),
            {"target_project_id": str(target_project.id)},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        issue.refresh_from_db()
        assert issue.project_id == target_project.id
        assert issue.state_id == target_state.id
        assert issue.type_id == target_type.id

    @pytest.mark.django_db
    def test_move_issue_requires_source_project_member_permission(self, session_client, workspace, create_user):
        source_project, source_state = build_project(
            workspace, create_user, name="Source", identifier="SRC", role=ROLE_GUEST
        )
        target_project, _ = build_project(workspace, create_user, name="Target", identifier="TGT", role=ROLE_MEMBER)
        issue = Issue.objects.create(name="Move me", workspace=workspace, project=source_project, state=source_state)

        response = session_client.post(
            move_url(workspace.slug, source_project.id, issue.id),
            {"target_project_id": str(target_project.id)},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    def test_move_issue_requires_target_project_member_permission(self, session_client, workspace, create_user):
        source_project, source_state = build_project(
            workspace, create_user, name="Source", identifier="SRC", role=ROLE_MEMBER
        )
        target_project, _ = build_project(workspace, create_user, name="Target", identifier="TGT", role=ROLE_GUEST)
        issue = Issue.objects.create(name="Move me", workspace=workspace, project=source_project, state=source_state)

        response = session_client.post(
            move_url(workspace.slug, source_project.id, issue.id),
            {"target_project_id": str(target_project.id)},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    @pytest.mark.parametrize(
        "payload,expected_error",
        [
            ({}, "Target project is required"),
            ({"target_project_id": "not-a-uuid"}, "Target project is invalid"),
        ],
    )
    def test_move_issue_validates_target_project_payload(
        self, session_client, workspace, create_user, payload, expected_error
    ):
        source_project, source_state = build_project(
            workspace, create_user, name="Source", identifier="SRC", role=ROLE_MEMBER
        )
        issue = Issue.objects.create(name="Move me", workspace=workspace, project=source_project, state=source_state)

        response = session_client.post(move_url(workspace.slug, source_project.id, issue.id), payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["error"] == expected_error

    @pytest.mark.django_db
    def test_move_issue_disallows_same_project(self, session_client, workspace, create_user):
        source_project, source_state = build_project(
            workspace, create_user, name="Source", identifier="SRC", role=ROLE_MEMBER
        )
        issue = Issue.objects.create(name="Move me", workspace=workspace, project=source_project, state=source_state)

        response = session_client.post(
            move_url(workspace.slug, source_project.id, issue.id),
            {"target_project_id": str(source_project.id)},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["error"] == "Target project must be different"

    @pytest.mark.django_db
    def test_move_issue_disallows_missing_target_project(self, session_client, workspace, create_user):
        source_project, source_state = build_project(
            workspace, create_user, name="Source", identifier="SRC", role=ROLE_MEMBER
        )
        issue = Issue.objects.create(name="Move me", workspace=workspace, project=source_project, state=source_state)

        response = session_client.post(
            move_url(workspace.slug, source_project.id, issue.id),
            {"target_project_id": "00000000-0000-4000-8000-000000000000"},
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["error"] == "Target project not found"

    @pytest.mark.django_db
    @pytest.mark.parametrize("mutation,expected_error", [
        ("archived", "Archived work items cannot be moved"),
        ("draft", "Draft work items cannot be moved"),
        ("intake", "Intake work items cannot be moved"),
        ("epic", "Epics cannot be moved"),
    ])
    def test_move_issue_disallows_special_work_item_types(
        self, session_client, workspace, create_user, mutation, expected_error
    ):
        source_project, source_state = build_project(
            workspace, create_user, name="Source", identifier="SRC", role=ROLE_MEMBER
        )
        target_project, _ = build_project(workspace, create_user, name="Target", identifier="TGT", role=ROLE_MEMBER)
        issue = Issue.objects.create(name="Move me", workspace=workspace, project=source_project, state=source_state)

        if mutation == "archived":
            issue.archived_at = timezone.now().date()
            issue.save()
        elif mutation == "draft":
            issue.is_draft = True
            issue.save()
        elif mutation == "intake":
            intake = Intake.objects.create(name="Inbox", project=source_project)
            IntakeIssue.objects.create(issue=issue, intake=intake, status=-2, project=source_project)
        elif mutation == "epic":
            epic_type = IssueType.objects.create(name="Epic", workspace=workspace, is_epic=True)
            issue.type = epic_type
            issue.save()

        response = session_client.post(
            move_url(workspace.slug, source_project.id, issue.id),
            {"target_project_id": str(target_project.id)},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["error"] == expected_error

# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from rest_framework import serializers

from .base import BaseSerializer
from .issue import IssueFlatSerializer
from .project import ProjectLiteSerializer
from .user import UserLiteSerializer
from .workspace import WorkspaceLiteSerializer
from plane.db.models import IssueActivity, Worklog


ISSUE_ACTIVITY_KIND = "issue_activity"
WORKLOG_ACTIVITY_KIND = "worklog"


class UserActivityIssuePayloadSerializer(BaseSerializer):
    class Meta:
        model = IssueActivity
        fields = [
            "verb",
            "field",
            "old_value",
            "new_value",
            "old_identifier",
            "new_identifier",
            "comment",
            "attachments",
            "issue_comment",
        ]
        read_only_fields = fields


class UserActivityWorklogPayloadSerializer(BaseSerializer):
    class Meta:
        model = Worklog
        fields = [
            "duration",
            "hours",
            "minutes",
            "display_duration",
            "description",
            "source",
            "logged_at",
        ]
        read_only_fields = fields


class UserActivityIssueSerializer(BaseSerializer):
    activity_kind = serializers.SerializerMethodField()
    actor = serializers.UUIDField(source="actor_id", read_only=True, allow_null=True)
    actor_detail = UserLiteSerializer(source="actor", read_only=True)
    issue = serializers.UUIDField(source="issue_id", read_only=True, allow_null=True)
    issue_detail = IssueFlatSerializer(source="issue", read_only=True)
    project = serializers.UUIDField(source="project_id", read_only=True)
    project_detail = ProjectLiteSerializer(source="project", read_only=True)
    workspace = serializers.UUIDField(source="workspace_id", read_only=True)
    workspace_detail = WorkspaceLiteSerializer(source="workspace", read_only=True)
    payload = UserActivityIssuePayloadSerializer(source="*", read_only=True)

    class Meta:
        model = IssueActivity
        fields = [
            "id",
            "activity_kind",
            "actor",
            "actor_detail",
            "issue",
            "issue_detail",
            "project",
            "project_detail",
            "workspace",
            "workspace_detail",
            "created_at",
            "updated_at",
            "payload",
        ]
        read_only_fields = fields

    def get_activity_kind(self, _obj):
        return ISSUE_ACTIVITY_KIND


class UserActivityWorklogSerializer(BaseSerializer):
    activity_kind = serializers.SerializerMethodField()
    actor = serializers.UUIDField(source="user_id", read_only=True)
    actor_detail = UserLiteSerializer(source="user", read_only=True)
    issue = serializers.UUIDField(source="issue_id", read_only=True)
    issue_detail = IssueFlatSerializer(source="issue", read_only=True)
    project = serializers.UUIDField(source="project_id", read_only=True)
    project_detail = ProjectLiteSerializer(source="project", read_only=True)
    workspace = serializers.UUIDField(source="workspace_id", read_only=True)
    workspace_detail = WorkspaceLiteSerializer(source="workspace", read_only=True)
    payload = UserActivityWorklogPayloadSerializer(source="*", read_only=True)

    class Meta:
        model = Worklog
        fields = [
            "id",
            "activity_kind",
            "actor",
            "actor_detail",
            "issue",
            "issue_detail",
            "project",
            "project_detail",
            "workspace",
            "workspace_detail",
            "created_at",
            "updated_at",
            "payload",
        ]
        read_only_fields = fields

    def get_activity_kind(self, _obj):
        return WORKLOG_ACTIVITY_KIND

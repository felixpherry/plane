# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from rest_framework import serializers

from .base import BaseSerializer
from plane.db.models import Issue, Page, WorkItemPageLink
from .project import ProjectLiteSerializer


class WorkItemLinkedPageSerializer(BaseSerializer):
    project_ids = serializers.SerializerMethodField()

    class Meta:
        model = Page
        fields = [
            "id",
            "name",
            "access",
            "color",
            "is_locked",
            "archived_at",
            "workspace",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "logo_props",
            "project_ids",
        ]
        read_only_fields = fields

    def get_project_ids(self, obj):
        return [str(project_id) for project_id in obj.projects.values_list("id", flat=True)]


class WorkItemPageLinkSerializer(BaseSerializer):
    page_detail = WorkItemLinkedPageSerializer(source="page", read_only=True)

    class Meta:
        model = WorkItemPageLink
        fields = [
            "id",
            "workspace",
            "project",
            "issue",
            "page",
            "page_detail",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "deleted_at",
        ]
        read_only_fields = fields


class PageBacklinkIssueSerializer(BaseSerializer):
    project_detail = ProjectLiteSerializer(source="project", read_only=True)

    class Meta:
        model = Issue
        fields = ["id", "name", "sequence_id", "project_id", "project_detail"]
        read_only_fields = fields


class PageBacklinkSerializer(BaseSerializer):
    issue_detail = PageBacklinkIssueSerializer(source="issue", read_only=True)

    class Meta:
        model = WorkItemPageLink
        fields = [
            "id",
            "workspace",
            "project",
            "issue",
            "issue_detail",
            "created_at",
            "updated_at",
            "deleted_at",
        ]
        read_only_fields = fields


class WorkItemPageLinkReplaceSerializer(serializers.Serializer):
    page_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=True,
        required=True,
    )

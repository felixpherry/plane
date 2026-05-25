# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from rest_framework import serializers

from plane.api.serializers.base import BaseSerializer
from plane.db.models import Page, PageLabel, Project, ProjectPage, Label


class PageSerializer(BaseSerializer):
    labels = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=Label.objects.all()),
        write_only=True,
        required=False,
    )
    project_ids = serializers.SerializerMethodField()
    description_html = serializers.CharField(required=False, allow_blank=True, default="<p></p>")

    def get_project_ids(self, obj):
        return list(obj.projects.values_list("id", flat=True))

    class Meta:
        model = Page
        fields = [
            "id",
            "name",
            "owned_by",
            "access",
            "color",
            "labels",
            "parent",
            "is_locked",
            "archived_at",
            "workspace",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "view_props",
            "logo_props",
            "project_ids",
            "description_html",
        ]
        read_only_fields = [
            "workspace",
            "owned_by",
            "is_locked",
            "archived_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def create(self, validated_data):
        labels = validated_data.pop("labels", None)
        description_html = validated_data.pop("description_html", "<p></p>")
        project_id = self.context["project_id"]
        owned_by_id = self.context["owned_by_id"]
        project = Project.objects.get(pk=project_id)

        page = Page.objects.create(
            **validated_data,
            description_html=description_html,
            owned_by_id=owned_by_id,
            workspace_id=project.workspace_id,
        )

        ProjectPage.objects.create(
            workspace_id=page.workspace_id,
            project_id=project_id,
            page_id=page.id,
            created_by_id=page.created_by_id,
            updated_by_id=page.updated_by_id,
        )

        if labels is not None:
            PageLabel.objects.bulk_create(
                [
                    PageLabel(
                        label=label,
                        page=page,
                        workspace_id=page.workspace_id,
                        created_by_id=page.created_by_id,
                        updated_by_id=page.updated_by_id,
                    )
                    for label in labels
                ],
                batch_size=10,
            )

        return page

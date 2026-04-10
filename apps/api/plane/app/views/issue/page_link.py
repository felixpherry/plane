# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.response import Response

from plane.api.serializers import WorkItemPageLinkReplaceSerializer, WorkItemPageLinkSerializer
from plane.app.permissions import ROLE, allow_permission
from plane.app.views.base import BaseAPIView
from plane.utils.work_item_page_links import (
    get_visible_work_item_page_links,
    replace_visible_work_item_page_links,
)


class WorkItemPageLinkEndpoint(BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def get(self, request, slug, project_id, work_item_id):
        try:
            links = get_visible_work_item_page_links(
                user=request.user,
                workspace_slug=slug,
                project_id=project_id,
                issue_id=work_item_id,
            )
        except ObjectDoesNotExist:
            return Response(
                {"error": "The requested resource does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = WorkItemPageLinkSerializer(links, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def put(self, request, slug, project_id, work_item_id):
        payload = WorkItemPageLinkReplaceSerializer(data=request.data)
        if not payload.is_valid():
            return Response(payload.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            links, invalid_page_ids = replace_visible_work_item_page_links(
                user=request.user,
                workspace_slug=slug,
                project_id=project_id,
                issue_id=work_item_id,
                page_ids=payload.validated_data["page_ids"],
            )
        except ObjectDoesNotExist:
            return Response(
                {"error": "The requested resource does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if invalid_page_ids:
            return Response(
                {
                    "error": "One or more pages are not available for this work item.",
                    "page_ids": invalid_page_ids,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = WorkItemPageLinkSerializer(links, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

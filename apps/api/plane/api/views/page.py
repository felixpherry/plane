# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from rest_framework import status
from rest_framework.response import Response

from plane.api.serializers import PageSerializer
from plane.app.permissions import ProjectPagePermission
from plane.bgtasks.page_transaction_task import page_transaction
from plane.db.models import Page
from .base import BaseAPIView


class PageListCreateAPIEndpoint(BaseAPIView):
    model = Page
    permission_classes = [ProjectPagePermission]
    serializer_class = PageSerializer

    def get_queryset(self):
        return (
            Page.objects.filter(
                workspace__slug=self.kwargs.get("slug"),
                projects__id=self.kwargs.get("project_id"),
                project_pages__deleted_at__isnull=True,
                deleted_at__isnull=True,
            )
            .distinct()
            .order_by("-created_at")
        )

    def get(self, request, slug, project_id):
        pages = self.get_queryset()
        serializer = PageSerializer(pages, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, slug, project_id):
        serializer = PageSerializer(
            data=request.data,
            context={
                "project_id": project_id,
                "owned_by_id": request.user.id,
            },
        )

        if serializer.is_valid():
            serializer.save()
            page_transaction.delay(
                new_description_html=request.data.get("description_html", "<p></p>"),
                old_description_html=None,
                page_id=serializer.data["id"],
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

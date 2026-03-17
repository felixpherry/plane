# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third Party imports
from rest_framework.response import Response
from rest_framework import status

# Module imports
from plane.app.views.base import BaseViewSet, BaseAPIView
from plane.app.permissions import allow_permission, ROLE
from plane.api.serializers import (
    CustomFieldSerializer,
    CustomFieldValueSerializer,
    CustomFieldValueCreateSerializer,
)
from plane.db.models import CustomField, CustomFieldValue


class CustomFieldViewSet(BaseViewSet):
    """Session-authenticated viewset for managing custom field definitions."""

    serializer_class = CustomFieldSerializer
    model = CustomField

    def get_queryset(self):
        return (
            CustomField.objects.filter(
                workspace__slug=self.kwargs.get("slug"),
                project_id=self.kwargs.get("project_id"),
                deleted_at__isnull=True,
            )
            .select_related("workspace", "project")
            .order_by("sort_order")
        )

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def list(self, request, slug, project_id):
        fields = self.get_queryset()
        serializer = CustomFieldSerializer(fields, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN])
    def create(self, request, slug, project_id):
        serializer = CustomFieldSerializer(
            data=request.data,
            context={"project_id": project_id},
        )
        if serializer.is_valid():
            serializer.save(project_id=project_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def retrieve(self, request, slug, project_id, pk):
        field = self.get_queryset().filter(pk=pk).first()
        if not field:
            return Response(
                {"error": "Custom field not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = CustomFieldSerializer(field)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN])
    def partial_update(self, request, slug, project_id, pk):
        field = self.get_queryset().filter(pk=pk).first()
        if not field:
            return Response(
                {"error": "Custom field not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = CustomFieldSerializer(
            field,
            data=request.data,
            partial=True,
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission([ROLE.ADMIN])
    def destroy(self, request, slug, project_id, pk):
        field = self.get_queryset().filter(pk=pk).first()
        if not field:
            return Response(
                {"error": "Custom field not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        # Soft delete the field and all its values
        field.deleted_at = __import__("django.utils.timezone", fromlist=["now"]).now()
        field.save()
        CustomFieldValue.objects.filter(
            custom_field=field, deleted_at__isnull=True
        ).update(
            deleted_at=field.deleted_at
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomFieldValueListCreateEndpoint(BaseAPIView):
    """Session-authenticated endpoint for listing and creating custom field values."""

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def get(self, request, slug, project_id, issue_id):
        values = (
            CustomFieldValue.objects.filter(
                workspace__slug=slug,
                project_id=project_id,
                issue_id=issue_id,
                deleted_at__isnull=True,
                custom_field__deleted_at__isnull=True,
            )
            .select_related("custom_field")
            .order_by("custom_field__sort_order")
        )
        serializer = CustomFieldValueSerializer(values, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def post(self, request, slug, project_id, issue_id):
        data_list = request.data if isinstance(request.data, list) else [request.data]
        results = []
        errors = []

        for item in data_list:
            custom_field_id = item.get("custom_field")
            value = item.get("value")

            try:
                custom_field = CustomField.objects.get(
                    id=custom_field_id,
                    project_id=project_id,
                    deleted_at__isnull=True,
                )
            except CustomField.DoesNotExist:
                errors.append(
                    {"custom_field": custom_field_id, "error": "Custom field not found"}
                )
                continue

            # Upsert — update if exists, create if not
            existing = CustomFieldValue.objects.filter(
                issue_id=issue_id,
                custom_field_id=custom_field_id,
                deleted_at__isnull=True,
            ).first()

            if existing:
                serializer = CustomFieldValueSerializer(
                    existing, data={"value": value}, partial=True
                )
            else:
                serializer = CustomFieldValueCreateSerializer(
                    data={"custom_field": custom_field_id, "value": value}
                )

            if serializer.is_valid():
                serializer.save(
                    issue_id=issue_id,
                    project_id=project_id,
                    workspace=custom_field.workspace,
                )
                results.append(
                    {"custom_field": str(custom_field_id), "value": value}
                )
            else:
                errors.append(
                    {
                        "custom_field": str(custom_field_id),
                        "error": serializer.errors,
                    }
                )

        return Response(
            {"results": results, "errors": errors},
            status=status.HTTP_200_OK,
        )


class CustomFieldValueDetailEndpoint(BaseAPIView):
    """Session-authenticated endpoint for updating/deleting a single custom field value."""

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def patch(self, request, slug, project_id, issue_id, pk):
        value = CustomFieldValue.objects.filter(
            pk=pk,
            workspace__slug=slug,
            project_id=project_id,
            issue_id=issue_id,
            deleted_at__isnull=True,
        ).first()
        if not value:
            return Response(
                {"error": "Custom field value not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = CustomFieldValueSerializer(
            value, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def delete(self, request, slug, project_id, issue_id, pk):
        value = CustomFieldValue.objects.filter(
            pk=pk,
            workspace__slug=slug,
            project_id=project_id,
            issue_id=issue_id,
            deleted_at__isnull=True,
        ).first()
        if not value:
            return Response(
                {"error": "Custom field value not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        value.deleted_at = __import__("django.utils.timezone", fromlist=["now"]).now()
        value.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

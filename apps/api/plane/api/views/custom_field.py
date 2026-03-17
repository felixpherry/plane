# Custom Fields API Views
# Follows the same patterns as LabelListCreateAPIEndpoint / LabelDetailAPIEndpoint

# Django imports
from django.db import IntegrityError
from django.utils import timezone

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Module imports
from plane.api.serializers import (
    CustomFieldSerializer,
    CustomFieldValueSerializer,
    CustomFieldValueCreateSerializer,
)
from plane.app.permissions import ProjectEntityPermission, ProjectMemberPermission
from plane.db.models import (
    CustomField,
    CustomFieldValue,
    Project,
    Issue,
)
from .base import BaseAPIView


class CustomFieldListCreateAPIEndpoint(BaseAPIView):
    """API endpoint for listing and creating custom fields for a project."""

    model = CustomField
    permission_classes = [ProjectEntityPermission]
    serializer_class = CustomFieldSerializer

    def get_queryset(self):
        return CustomField.objects.filter(
            workspace__slug=self.kwargs.get("slug"),
            project_id=self.kwargs.get("project_id"),
            deleted_at__isnull=True,
        ).order_by("sort_order")

    def get(self, request, slug, project_id):
        """List all custom fields for a project."""
        custom_fields = self.get_queryset()
        serializer = CustomFieldSerializer(custom_fields, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, slug, project_id):
        """Create a new custom field for a project."""
        project = Project.objects.get(pk=project_id, workspace__slug=slug)

        serializer = CustomFieldSerializer(
            data=request.data,
            context={
                "project_id": project_id,
                "workspace_id": project.workspace_id,
            },
        )

        if serializer.is_valid():
            try:
                serializer.save(
                    project_id=project_id,
                    workspace_id=project.workspace_id,
                )
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except IntegrityError:
                return Response(
                    {"error": "A custom field with this name already exists in the project."},
                    status=status.HTTP_409_CONFLICT,
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomFieldDetailAPIEndpoint(BaseAPIView):
    """API endpoint for retrieving, updating, and deleting a custom field."""

    model = CustomField
    permission_classes = [ProjectEntityPermission]
    serializer_class = CustomFieldSerializer

    def get_queryset(self):
        return CustomField.objects.filter(
            workspace__slug=self.kwargs.get("slug"),
            project_id=self.kwargs.get("project_id"),
            deleted_at__isnull=True,
        )

    def get(self, request, slug, project_id, pk):
        """Retrieve a custom field."""
        custom_field = self.get_queryset().get(pk=pk)
        serializer = CustomFieldSerializer(custom_field)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, slug, project_id, pk):
        """Update a custom field."""
        custom_field = self.get_queryset().get(pk=pk)
        serializer = CustomFieldSerializer(
            custom_field,
            data=request.data,
            partial=True,
            context={
                "project_id": project_id,
                "workspace_id": custom_field.workspace_id,
            },
        )

        if serializer.is_valid():
            try:
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            except IntegrityError:
                return Response(
                    {"error": "A custom field with this name already exists in the project."},
                    status=status.HTTP_409_CONFLICT,
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, slug, project_id, pk):
        """Soft-delete a custom field and all its values."""
        custom_field = self.get_queryset().get(pk=pk)

        # Soft-delete all associated values
        CustomFieldValue.objects.filter(
            custom_field=custom_field,
            deleted_at__isnull=True,
        ).update(deleted_at=timezone.now())

        # Soft-delete the field itself
        custom_field.deleted_at = timezone.now()
        custom_field.save(update_fields=["deleted_at"])

        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomFieldValueListCreateAPIEndpoint(BaseAPIView):
    """API endpoint for listing and setting custom field values on an issue."""

    model = CustomFieldValue
    permission_classes = [ProjectEntityPermission]
    serializer_class = CustomFieldValueSerializer

    def get_queryset(self):
        return CustomFieldValue.objects.filter(
            workspace__slug=self.kwargs.get("slug"),
            issue_id=self.kwargs.get("issue_id"),
            deleted_at__isnull=True,
        ).select_related("custom_field").order_by("custom_field__sort_order")

    def get(self, request, slug, project_id, issue_id):
        """List all custom field values for an issue."""
        values = self.get_queryset()
        serializer = CustomFieldValueSerializer(values, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, slug, project_id, issue_id):
        """Create or update custom field values for an issue.

        Accepts either a single object or a list of objects:
        {"custom_field": "uuid", "value": ...}
        or
        [{"custom_field": "uuid", "value": ...}, ...]
        """
        project = Project.objects.get(pk=project_id, workspace__slug=slug)
        issue = Issue.objects.get(pk=issue_id, project_id=project_id)

        # Support both single and bulk creation
        data_list = request.data if isinstance(request.data, list) else [request.data]

        results = []
        errors = []

        for item_data in data_list:
            custom_field_id = item_data.get("custom_field")

            if not custom_field_id:
                errors.append({"error": "custom_field is required"})
                continue

            # Verify the custom field belongs to this project
            try:
                custom_field = CustomField.objects.get(
                    pk=custom_field_id,
                    project_id=project_id,
                    deleted_at__isnull=True,
                )
            except CustomField.DoesNotExist:
                errors.append(
                    {"error": f"Custom field {custom_field_id} not found in this project."}
                )
                continue

            # Check if value already exists (upsert)
            existing_value = CustomFieldValue.objects.filter(
                issue=issue,
                custom_field=custom_field,
                deleted_at__isnull=True,
            ).first()

            if existing_value:
                # Update existing value
                serializer = CustomFieldValueCreateSerializer(
                    existing_value,
                    data=item_data,
                    partial=True,
                    context={
                        "custom_field": custom_field,
                    },
                )
            else:
                # Create new value
                serializer = CustomFieldValueCreateSerializer(
                    data=item_data,
                    context={
                        "custom_field": custom_field,
                    },
                )

            if serializer.is_valid():
                serializer.save(
                    issue=issue,
                    custom_field=custom_field,
                    project_id=project_id,
                    workspace_id=project.workspace_id,
                )
                results.append(serializer.data)
            else:
                errors.append(serializer.errors)

        if errors and not results:
            return Response(
                {"errors": errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"results": results, "errors": errors},
            status=status.HTTP_201_CREATED,
        )


class CustomFieldValueDetailAPIEndpoint(BaseAPIView):
    """API endpoint for updating and deleting a custom field value."""

    model = CustomFieldValue
    permission_classes = [ProjectEntityPermission]
    serializer_class = CustomFieldValueSerializer

    def get_queryset(self):
        return CustomFieldValue.objects.filter(
            workspace__slug=self.kwargs.get("slug"),
            issue_id=self.kwargs.get("issue_id"),
            deleted_at__isnull=True,
        ).select_related("custom_field")

    def patch(self, request, slug, project_id, issue_id, pk):
        """Update a custom field value."""
        value_obj = self.get_queryset().get(pk=pk)
        serializer = CustomFieldValueCreateSerializer(
            value_obj,
            data=request.data,
            partial=True,
            context={
                "custom_field": value_obj.custom_field,
            },
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, slug, project_id, issue_id, pk):
        """Soft-delete a custom field value."""
        value_obj = self.get_queryset().get(pk=pk)
        value_obj.deleted_at = timezone.now()
        value_obj.save(update_fields=["deleted_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

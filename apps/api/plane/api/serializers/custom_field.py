# Custom Field Serializers for Plane Community Edition
# SPDX-License-Identifier: AGPL-3.0-only

from rest_framework import serializers

from .base import BaseSerializer
from plane.db.models import CustomField, CustomFieldValue, FieldType


class CustomFieldSerializer(BaseSerializer):
    """
    Serializer for custom field definitions.

    Handles validation of field types and their options.
    Select and multi_select fields must have at least one option.
    """

    class Meta:
        model = CustomField
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "workspace",
            "project",
            "deleted_at",
            "sort_order",
        ]

    def validate(self, data):
        field_type = data.get("field_type", getattr(self.instance, "field_type", None))
        options = data.get("options", getattr(self.instance, "options", []))

        # Select and multi_select fields must have at least one option
        if field_type in (FieldType.SELECT, FieldType.MULTI_SELECT):
            if not options or len(options) == 0:
                raise serializers.ValidationError(
                    {"options": "Select and multi-select fields must have at least one option."}
                )
            # Ensure all options are strings
            if not all(isinstance(opt, str) for opt in options):
                raise serializers.ValidationError(
                    {"options": "All options must be strings."}
                )
            # Ensure no duplicate options
            if len(options) != len(set(options)):
                raise serializers.ValidationError(
                    {"options": "Duplicate options are not allowed."}
                )

        # Non-select fields should not have options
        if field_type not in (FieldType.SELECT, FieldType.MULTI_SELECT):
            data["options"] = []

        return data


class CustomFieldLiteSerializer(BaseSerializer):
    """
    Lightweight serializer for custom fields.

    Used when embedding custom field info inside value responses.
    """

    class Meta:
        model = CustomField
        fields = [
            "id",
            "name",
            "field_type",
            "options",
            "is_required",
            "sort_order",
        ]
        read_only_fields = fields


class CustomFieldValueSerializer(BaseSerializer):
    """
    Serializer for custom field values on issues.

    Validates that the value matches the expected type of the custom field.
    """

    custom_field_detail = CustomFieldLiteSerializer(
        source="custom_field", read_only=True
    )

    class Meta:
        model = CustomFieldValue
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "workspace",
            "project",
            "deleted_at",
            "issue",
        ]

    def validate(self, data):
        custom_field = data.get(
            "custom_field",
            getattr(self.instance, "custom_field", None),
        )
        value = data.get("value", {})
        raw_value = value.get("value") if isinstance(value, dict) else None

        if custom_field is None:
            raise serializers.ValidationError(
                {"custom_field": "Custom field is required."}
            )

        # Required field check
        if custom_field.is_required and raw_value in (None, "", [], {}):
            raise serializers.ValidationError(
                {"value": f"{custom_field.name} is required."}
            )

        # Skip further validation if value is empty and not required
        if raw_value is None:
            return data

        # Type-specific validation
        field_type = custom_field.field_type

        if field_type == FieldType.TEXT:
            if not isinstance(raw_value, str):
                raise serializers.ValidationError(
                    {"value": "Text field value must be a string."}
                )

        elif field_type == FieldType.NUMBER:
            if not isinstance(raw_value, (int, float)):
                raise serializers.ValidationError(
                    {"value": "Number field value must be a number."}
                )

        elif field_type == FieldType.SELECT:
            if not isinstance(raw_value, str):
                raise serializers.ValidationError(
                    {"value": "Select field value must be a string."}
                )
            if raw_value not in custom_field.options:
                raise serializers.ValidationError(
                    {"value": f"'{raw_value}' is not a valid option. Valid options: {custom_field.options}"}
                )

        elif field_type == FieldType.MULTI_SELECT:
            if not isinstance(raw_value, list):
                raise serializers.ValidationError(
                    {"value": "Multi-select field value must be a list."}
                )
            invalid = [v for v in raw_value if v not in custom_field.options]
            if invalid:
                raise serializers.ValidationError(
                    {"value": f"Invalid options: {invalid}. Valid options: {custom_field.options}"}
                )

        elif field_type == FieldType.DATE:
            if not isinstance(raw_value, str):
                raise serializers.ValidationError(
                    {"value": "Date field value must be a string in YYYY-MM-DD format."}
                )

        elif field_type == FieldType.CHECKBOX:
            if not isinstance(raw_value, bool):
                raise serializers.ValidationError(
                    {"value": "Checkbox field value must be a boolean."}
                )

        elif field_type == FieldType.URL:
            if not isinstance(raw_value, str):
                raise serializers.ValidationError(
                    {"value": "URL field value must be a string."}
                )
            if not raw_value.startswith(("http://", "https://")):
                raise serializers.ValidationError(
                    {"value": "URL must start with http:// or https://"}
                )

        return data


class CustomFieldValueCreateSerializer(BaseSerializer):
    """
    Simplified serializer for creating/updating custom field values.

    Accepts just the custom_field ID and value without requiring
    the full nested object.
    """

    class Meta:
        model = CustomFieldValue
        fields = ["custom_field", "value"]

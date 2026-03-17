# Custom Fields for Plane Community Edition
# This module adds custom field support — the #1 community-requested feature.
# SPDX-License-Identifier: AGPL-3.0-only

from django.db import models
from django.db.models import Q

from .workspace import WorkspaceBaseModel


class FieldType(models.TextChoices):
    TEXT = "text", "Text"
    NUMBER = "number", "Number"
    SELECT = "select", "Select"
    MULTI_SELECT = "multi_select", "Multi Select"
    DATE = "date", "Date"
    CHECKBOX = "checkbox", "Checkbox"
    URL = "url", "URL"


class CustomField(WorkspaceBaseModel):
    """Defines a custom field for a project.

    Each project can have multiple custom fields. These fields
    appear in the issue detail sidebar under "Custom Properties".
    """

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    field_type = models.CharField(
        max_length=50,
        choices=FieldType.choices,
        default=FieldType.TEXT,
    )
    options = models.JSONField(
        default=list,
        blank=True,
        help_text="Options for select/multi_select fields. e.g. ['Engineering', 'HR', 'Finance']",
    )
    is_required = models.BooleanField(default=False)
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this custom field is active. Disabled fields are hidden from the issue sidebar.",
    )
    sort_order = models.FloatField(default=65535)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["project", "name"],
                condition=Q(deleted_at__isnull=True),
                name="custom_field_unique_project_name_when_not_deleted",
            ),
        ]
        verbose_name = "Custom Field"
        verbose_name_plural = "Custom Fields"
        db_table = "custom_fields"
        ordering = ("sort_order", "created_at")

    def save(self, *args, **kwargs):
        if self._state.adding:
            last_id = CustomField.objects.filter(
                project=self.project
            ).aggregate(
                largest=models.Max("sort_order")
            )["largest"]
            if last_id is not None:
                self.sort_order = last_id + 10000

        super(CustomField, self).save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.field_type})"


class CustomFieldValue(WorkspaceBaseModel):
    """Stores the value of a custom field for a specific issue.

    Uses a JSONField for value storage to support any field type:
    - text:         {"value": "some text"}
    - number:       {"value": 42}
    - select:       {"value": "Engineering"}
    - multi_select: {"value": ["Tag1", "Tag2"]}
    - date:         {"value": "2026-03-17"}
    - checkbox:     {"value": true}
    - url:          {"value": "https://example.com"}
    """

    issue = models.ForeignKey(
        "db.Issue",
        on_delete=models.CASCADE,
        related_name="custom_field_values",
    )
    custom_field = models.ForeignKey(
        CustomField,
        on_delete=models.CASCADE,
        related_name="values",
    )
    value = models.JSONField(
        default=dict,
        help_text="The value of this custom field for this issue.",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["issue", "custom_field"],
                condition=Q(deleted_at__isnull=True),
                name="custom_field_value_unique_issue_field_when_not_deleted",
            ),
        ]
        verbose_name = "Custom Field Value"
        verbose_name_plural = "Custom Field Values"
        db_table = "custom_field_values"
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.custom_field.name}: {self.value}"

# Custom Fields URL Configuration
# Follows the same pattern as label.py

from django.urls import path

from plane.api.views import (
    CustomFieldListCreateAPIEndpoint,
    CustomFieldDetailAPIEndpoint,
    CustomFieldValueListCreateAPIEndpoint,
    CustomFieldValueDetailAPIEndpoint,
)


urlpatterns = [
    # Custom field definitions (project-level)
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/custom-fields/",
        CustomFieldListCreateAPIEndpoint.as_view(http_method_names=["get", "post"]),
        name="custom-field",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/custom-fields/<uuid:pk>/",
        CustomFieldDetailAPIEndpoint.as_view(http_method_names=["get", "patch", "delete"]),
        name="custom-field-detail",
    ),
    # Custom field values (issue-level)
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/custom-values/",
        CustomFieldValueListCreateAPIEndpoint.as_view(http_method_names=["get", "post"]),
        name="custom-field-value",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/custom-values/<uuid:pk>/",
        CustomFieldValueDetailAPIEndpoint.as_view(http_method_names=["get", "patch", "delete"]),
        name="custom-field-value-detail",
    ),
]

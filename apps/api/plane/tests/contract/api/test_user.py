# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest
from rest_framework import status

from plane.db.models import Workspace, WorkspaceMember


@pytest.mark.contract
class TestUserWorkspacesAPIEndpoint:
    """Test API-token workspace discovery endpoint."""

    @pytest.mark.django_db
    def test_lists_active_workspaces_for_api_token_user(self, api_key_client, create_user, workspace):
        other_workspace = Workspace.objects.create(
            name="Other Workspace",
            owner=create_user,
            slug="other-workspace",
        )
        WorkspaceMember.objects.create(workspace=other_workspace, member=create_user, role=15)

        inactive_workspace = Workspace.objects.create(
            name="Inactive Workspace",
            owner=create_user,
            slug="inactive-workspace",
        )
        WorkspaceMember.objects.create(
            workspace=inactive_workspace,
            member=create_user,
            role=15,
            is_active=False,
        )

        response = api_key_client.get("/api/v1/users/me/workspaces/")

        assert response.status_code == status.HTTP_200_OK
        assert {item["slug"] for item in response.data} == {workspace.slug, other_workspace.slug}
        assert all(set(item) == {"name", "slug", "id"} for item in response.data)

    @pytest.mark.django_db
    def test_requires_api_token(self, api_client):
        response = api_client.get("/api/v1/users/me/workspaces/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

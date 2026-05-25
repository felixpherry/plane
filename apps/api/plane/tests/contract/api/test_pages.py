# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest
from rest_framework import status

from plane.db.models import Page, Project, ProjectMember, ProjectPage


@pytest.fixture
def project(db, workspace, create_user):
    project = Project.objects.create(
        name="Test Project",
        identifier="TP",
        workspace=workspace,
        created_by=create_user,
    )
    ProjectMember.objects.create(
        project=project,
        member=create_user,
        role=20,
        is_active=True,
    )
    return project


@pytest.mark.contract
class TestPageListCreateAPIEndpoint:
    def get_page_url(self, workspace_slug, project_id):
        return f"/api/v1/workspaces/{workspace_slug}/projects/{project_id}/pages/"

    @pytest.mark.django_db
    def test_create_page_from_markdown_html_payload(self, api_key_client, workspace, project, monkeypatch):
        monkeypatch.setattr("plane.api.views.page.page_transaction.delay", lambda **kwargs: None)
        url = self.get_page_url(workspace.slug, project.id)

        response = api_key_client.post(
            url,
            {
                "name": "Runbook",
                "description_html": "<h1>Ops</h1>\n",
                "access": Page.PRIVATE_ACCESS,
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert Page.objects.count() == 1
        page = Page.objects.first()
        assert page.name == "Runbook"
        assert page.description_html == "<h1>Ops</h1>\n"
        assert page.access == Page.PRIVATE_ACCESS
        assert page.workspace == workspace
        assert page.owned_by_id is not None
        assert ProjectPage.objects.filter(project=project, page=page).exists()
        assert response.data["id"] == str(page.id)
        assert response.data["name"] == "Runbook"
        assert response.data["description_html"] == "<h1>Ops</h1>\n"
        assert response.data["access"] == Page.PRIVATE_ACCESS

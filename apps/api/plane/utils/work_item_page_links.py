# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from plane.app.permissions import ROLE
from plane.db.models import Issue, Page, Project, ProjectMember, WorkItemPageLink


def get_work_item(workspace_slug, project_id, issue_id):
    return Issue.issue_objects.get(
        workspace__slug=workspace_slug,
        project_id=project_id,
        pk=issue_id,
    )


def get_visible_project_pages(user, workspace_slug, project_id):
    queryset = (
        Page.objects.filter(workspace__slug=workspace_slug)
        .filter(
            projects__project_projectmember__member=user,
            projects__project_projectmember__is_active=True,
            projects__archived_at__isnull=True,
        )
        .filter(projects__id=project_id)
        .filter(project_pages__deleted_at__isnull=True)
        .filter(parent__isnull=True)
        .filter(archived_at__isnull=True)
        .filter(Q(owned_by=user) | Q(access=Page.PUBLIC_ACCESS))
        .select_related("workspace", "owned_by")
        .prefetch_related("projects")
        .distinct()
    )

    project = Project.objects.get(pk=project_id, workspace__slug=workspace_slug)
    is_guest = ProjectMember.objects.filter(
        workspace__slug=workspace_slug,
        project_id=project_id,
        member=user,
        role=ROLE.GUEST.value,
        is_active=True,
    ).exists()

    if is_guest and not project.guest_view_all_features:
        queryset = queryset.filter(owned_by=user)

    return queryset


def get_visible_work_item_page_links(user, workspace_slug, project_id, issue_id):
    get_work_item(
        workspace_slug=workspace_slug,
        project_id=project_id,
        issue_id=issue_id,
    )
    visible_page_ids = get_visible_project_pages(
        user=user,
        workspace_slug=workspace_slug,
        project_id=project_id,
    ).values_list("id", flat=True)

    return (
        WorkItemPageLink.objects.filter(
            workspace__slug=workspace_slug,
            project_id=project_id,
            issue_id=issue_id,
            page_id__in=visible_page_ids,
            deleted_at__isnull=True,
        )
        .select_related("workspace", "project", "issue", "page")
        .prefetch_related("page__projects")
        .order_by("page__name", "created_at")
    )


def replace_visible_work_item_page_links(user, workspace_slug, project_id, issue_id, page_ids):
    issue = get_work_item(
        workspace_slug=workspace_slug,
        project_id=project_id,
        issue_id=issue_id,
    )
    requested_page_ids = {str(page_id) for page_id in page_ids}
    visible_pages = get_visible_project_pages(
        user=user,
        workspace_slug=workspace_slug,
        project_id=project_id,
    )
    visible_page_id_set = {str(page_id) for page_id in visible_pages.values_list("id", flat=True)}
    invalid_page_ids = sorted(requested_page_ids - visible_page_id_set)

    if invalid_page_ids:
        return None, invalid_page_ids

    with transaction.atomic():
        current_links = WorkItemPageLink.objects.filter(
            workspace__slug=workspace_slug,
            project_id=project_id,
            issue_id=issue_id,
            page_id__in=visible_page_id_set,
            deleted_at__isnull=True,
        )
        current_page_ids = {str(page_id) for page_id in current_links.values_list("page_id", flat=True)}

        remove_page_ids = current_page_ids - requested_page_ids
        if remove_page_ids:
            current_links.filter(page_id__in=remove_page_ids).update(deleted_at=timezone.now())

        add_page_ids = requested_page_ids - current_page_ids
        for page_id in add_page_ids:
            WorkItemPageLink.objects.create(
                project_id=project_id,
                issue=issue,
                page_id=page_id,
            )

    return get_visible_work_item_page_links(
        user=user,
        workspace_slug=workspace_slug,
        project_id=project_id,
        issue_id=issue_id,
    ), []

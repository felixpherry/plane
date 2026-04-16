# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from math import ceil

from rest_framework.exceptions import ParseError
from rest_framework.response import Response

from plane.app.serializers import (
    ISSUE_ACTIVITY_KIND,
    WORKLOG_ACTIVITY_KIND,
    UserActivityIssueSerializer,
    UserActivityWorklogSerializer,
)
from plane.utils.paginator import Cursor


def _build_activity_index(issue_queryset, worklog_queryset):
    issue_entries = [
        {
            "activity_kind": ISSUE_ACTIVITY_KIND,
            "object_id": item["id"],
            "created_at": item["created_at"],
        }
        for item in issue_queryset.values("id", "created_at")
    ]
    worklog_entries = [
        {
            "activity_kind": WORKLOG_ACTIVITY_KIND,
            "object_id": item["id"],
            "created_at": item["created_at"],
        }
        for item in worklog_queryset.values("id", "created_at")
    ]

    merged_entries = issue_entries + worklog_entries
    merged_entries.sort(
        key=lambda item: (item["created_at"], str(item["object_id"]), item["activity_kind"]),
        reverse=True,
    )
    return merged_entries


def _serialize_activity_entries(entries, issue_queryset, worklog_queryset):
    if not entries:
        return []

    issue_ids = [entry["object_id"] for entry in entries if entry["activity_kind"] == ISSUE_ACTIVITY_KIND]
    worklog_ids = [entry["object_id"] for entry in entries if entry["activity_kind"] == WORKLOG_ACTIVITY_KIND]

    serialized_issue_map = {}
    if issue_ids:
        issue_items = issue_queryset.filter(id__in=issue_ids)
        serialized_issue_map = {
            str(item["id"]): item for item in UserActivityIssueSerializer(issue_items, many=True).data
        }

    serialized_worklog_map = {}
    if worklog_ids:
        worklog_items = worklog_queryset.filter(id__in=worklog_ids)
        serialized_worklog_map = {
            str(item["id"]): item for item in UserActivityWorklogSerializer(worklog_items, many=True).data
        }

    serialized_entries = []
    for entry in entries:
        object_id = str(entry["object_id"])
        if entry["activity_kind"] == ISSUE_ACTIVITY_KIND:
            serialized_item = serialized_issue_map.get(object_id)
        else:
            serialized_item = serialized_worklog_map.get(object_id)

        if serialized_item is not None:
            serialized_entries.append(serialized_item)

    return serialized_entries


def paginate_mixed_user_activity(request, paginator, issue_queryset, worklog_queryset):
    per_page = paginator.get_per_page(request, default_per_page=1000, max_per_page=1000)

    try:
        input_cursor = Cursor.from_string(request.GET.get(paginator.cursor_name, f"{per_page}:0:0"))
    except ValueError as exc:
        raise ParseError(detail="Invalid cursor parameter.") from exc

    if input_cursor.offset < 0:
        raise ParseError(detail="Error in parsing")

    merged_entries = _build_activity_index(issue_queryset, worklog_queryset)
    total_results = len(merged_entries)
    total_pages = ceil(total_results / per_page) if total_results else 0

    start_index = input_cursor.offset * per_page
    end_index = start_index + per_page
    page_entries = merged_entries[start_index:end_index]
    results = _serialize_activity_entries(page_entries, issue_queryset, worklog_queryset)

    next_page_results = end_index < total_results
    prev_page_results = input_cursor.offset > 0

    return Response(
        {
            "grouped_by": None,
            "sub_grouped_by": None,
            "total_count": total_results,
            "next_cursor": str(Cursor(per_page, input_cursor.offset + 1, False, next_page_results)),
            "prev_cursor": str(Cursor(per_page, input_cursor.offset - 1, True, prev_page_results)),
            "next_page_results": next_page_results,
            "prev_page_results": prev_page_results,
            "count": len(results),
            "total_pages": total_pages,
            "total_results": total_results,
            "extra_stats": None,
            "results": results,
        }
    )


def get_mixed_user_activity_items(issue_queryset, worklog_queryset, limit=None):
    merged_entries = _build_activity_index(issue_queryset, worklog_queryset)
    if limit is not None:
        merged_entries = merged_entries[:limit]
    return _serialize_activity_entries(merged_entries, issue_queryset, worklog_queryset)

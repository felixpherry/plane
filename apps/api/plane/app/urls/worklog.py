# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.urls import path

from plane.app.views import (
    WorklogViewSet,
    TimerStartEndpoint,
    TimerStopEndpoint,
    TimerActiveEndpoint,
    TimerDiscardEndpoint,
    TimerHeartbeatEndpoint,
)

urlpatterns = [
    # Worklog CRUD per issue
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/worklogs/",
        WorklogViewSet.as_view({"get": "list", "post": "create"}),
        name="issue-worklogs",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/worklogs/<uuid:pk>/",
        WorklogViewSet.as_view({"patch": "partial_update", "delete": "destroy"}),
        name="issue-worklog-detail",
    ),
    # Timer endpoints (workspace-level, not issue-level)
    path(
        "workspaces/<str:slug>/timer/start/",
        TimerStartEndpoint.as_view(),
        name="timer-start",
    ),
    path(
        "workspaces/<str:slug>/timer/stop/",
        TimerStopEndpoint.as_view(),
        name="timer-stop",
    ),
    path(
        "workspaces/<str:slug>/timer/active/",
        TimerActiveEndpoint.as_view(),
        name="timer-active",
    ),
    path(
        "workspaces/<str:slug>/timer/discard/",
        TimerDiscardEndpoint.as_view(),
        name="timer-discard",
    ),
    path(
        "workspaces/<str:slug>/timer/heartbeat/",
        TimerHeartbeatEndpoint.as_view(),
        name="timer-heartbeat",
    ),
]

/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export const BLOCK_HEIGHT = 44;

export const HEADER_HEIGHT = 48;

export const GANTT_BREADCRUMBS_HEIGHT = 40;

export const SIDEBAR_WIDTH = 360;
export const GANTT_SIDEBAR_MIN_WIDTH = 240;
export const GANTT_SIDEBAR_MAX_WIDTH = 600;

export const DEFAULT_BLOCK_WIDTH = 60;

export const GANTT_SELECT_GROUP = "gantt-issues";

export const clampGanttSidebarWidth = (width: number) =>
  Math.min(Math.max(width, GANTT_SIDEBAR_MIN_WIDTH), GANTT_SIDEBAR_MAX_WIDTH);

export const getGanttSidebarWidthStorageKey = (projectId: string) => `gantt-sidebar-width:${projectId}`;

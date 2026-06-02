/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TIssue } from "@plane/types";

const WORKSPACE_LEVEL_STORE_TYPES = new Set([
  "PROFILE",
  "GLOBAL",
  "TEAM",
  "TEAM_VIEW",
  "TEAM_PROJECT_WORK_ITEMS",
  "WORKSPACE_DRAFT",
]);

export const shouldRenderSubWorkItemIndicator = (issue: Pick<TIssue, "parent_id"> | undefined, storeType: string) =>
  Boolean(issue?.parent_id && WORKSPACE_LEVEL_STORE_TYPES.has(storeType));

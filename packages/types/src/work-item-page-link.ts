/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TPage } from "./page";
import type { IProjectLite } from "./project";

export type TWorkItemLinkedPage = Pick<
  TPage,
  | "id"
  | "name"
  | "access"
  | "color"
  | "is_locked"
  | "archived_at"
  | "workspace"
  | "created_at"
  | "updated_at"
  | "created_by"
  | "updated_by"
  | "logo_props"
  | "project_ids"
>;

export type TWorkItemPageLink = {
  id: string;
  workspace: string;
  project: string;
  issue: string;
  page: string;
  page_detail: TWorkItemLinkedPage;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TWorkItemPageLinkReplacePayload = {
  page_ids: string[];
};

export type TPageBacklinkIssue = {
  id: string;
  name: string;
  sequence_id: number;
  project_id: string;
  project_detail: IProjectLite;
};

export type TPageBacklink = {
  id: string;
  workspace: string;
  project: string;
  issue: string;
  issue_detail: TPageBacklinkIssue;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

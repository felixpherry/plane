/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import type { TWorkItemPageLink, TWorkItemPageLinkReplacePayload } from "@plane/types";
import { APIService } from "../api.service";

export class WorkItemPageLinkService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  async list(workspaceSlug: string, projectId: string, workItemId: string): Promise<TWorkItemPageLink[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/page-links/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async replace(
    workspaceSlug: string,
    projectId: string,
    workItemId: string,
    data: TWorkItemPageLinkReplacePayload
  ): Promise<TWorkItemPageLink[]> {
    return this.put(`/api/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/page-links/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}

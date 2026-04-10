/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { action, computed, makeObservable, observable, runInAction } from "mobx";
import { set } from "lodash-es";
// services
import { WorkItemPageLinkService } from "@plane/services";
// types
import type { TWorkItemPageLink } from "@plane/types";
import type { IIssueDetail } from "./root.store";

export type TWorkItemPageLinkMap = {
  [linkId: string]: TWorkItemPageLink;
};

export type TWorkItemPageLinkIdMap = {
  [issueId: string]: string[];
};

export interface IWorkItemPageLinkStoreActions {
  addPageLinks: (issueId: string, links: TWorkItemPageLink[]) => void;
  fetchPageLinks: (workspaceSlug: string, projectId: string, issueId: string) => Promise<TWorkItemPageLink[]>;
  replacePageLinks: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    pageIds: string[]
  ) => Promise<TWorkItemPageLink[]>;
}

export interface IWorkItemPageLinkStore extends IWorkItemPageLinkStoreActions {
  links: TWorkItemPageLinkIdMap;
  linkMap: TWorkItemPageLinkMap;
  workItemPageLinks: string[] | undefined;
  getLinksByIssueId: (issueId: string) => string[] | undefined;
  getLinkById: (linkId: string) => TWorkItemPageLink | undefined;
  getPageLinkCountByIssueId: (issueId: string) => number;
}

export class WorkItemPageLinkStore implements IWorkItemPageLinkStore {
  links: TWorkItemPageLinkIdMap = {};
  linkMap: TWorkItemPageLinkMap = {};
  rootIssueDetailStore: IIssueDetail;
  service: WorkItemPageLinkService;

  constructor(rootStore: IIssueDetail) {
    makeObservable(this, {
      links: observable,
      linkMap: observable,
      workItemPageLinks: computed,
      addPageLinks: action.bound,
      fetchPageLinks: action,
      replacePageLinks: action,
    });

    this.rootIssueDetailStore = rootStore;
    this.service = new WorkItemPageLinkService();
  }

  get workItemPageLinks() {
    const issueId = this.rootIssueDetailStore.peekIssue?.issueId;
    if (!issueId) return undefined;
    return this.links[issueId] ?? undefined;
  }

  getLinksByIssueId = (issueId: string) => {
    if (!issueId) return undefined;
    return this.links[issueId] ?? undefined;
  };

  getLinkById = (linkId: string) => {
    if (!linkId) return undefined;
    return this.linkMap[linkId] ?? undefined;
  };

  getPageLinkCountByIssueId = (issueId: string) => this.links[issueId]?.length ?? 0;

  addPageLinks = (issueId: string, links: TWorkItemPageLink[]) => {
    runInAction(() => {
      this.links[issueId] = links.map((link) => link.id);
      links.forEach((link) => set(this.linkMap, link.id, link));
    });
  };

  fetchPageLinks = async (workspaceSlug: string, projectId: string, issueId: string) => {
    const response = await this.service.list(workspaceSlug, projectId, issueId);
    this.addPageLinks(issueId, response);
    return response;
  };

  replacePageLinks = async (workspaceSlug: string, projectId: string, issueId: string, pageIds: string[]) => {
    const response = await this.service.replace(workspaceSlug, projectId, issueId, { page_ids: pageIds });
    this.addPageLinks(issueId, response);
    return response;
  };
}

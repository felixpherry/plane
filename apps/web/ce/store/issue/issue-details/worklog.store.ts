/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { action, makeObservable, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
import { set } from "lodash-es";
import type { IWorklog, IWorklogCreatePayload, IWorklogUpdatePayload, TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
import { WorklogService } from "@plane/services";

export type TWorklogLoader = "fetch" | "create" | "update" | "delete" | "mutate" | undefined;

type TIssueWorklogIds = Record<string, string[]>;
type TIssueWorklogMap = Record<string, IWorklog>;
type TIssueWorklogTotals = Record<string, number>;

export interface IIssueWorklogStoreActions {
  fetchWorklogs: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    loaderType?: TWorklogLoader
  ) => Promise<IWorklog[]>;
  createWorklog: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    data: IWorklogCreatePayload
  ) => Promise<IWorklog>;
  updateWorklog: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    worklogId: string,
    data: IWorklogUpdatePayload
  ) => Promise<IWorklog>;
  removeWorklog: (workspaceSlug: string, projectId: string, issueId: string, worklogId: string) => Promise<void>;
}

export interface IIssueWorklogStore extends IIssueWorklogStoreActions {
  loader: TWorklogLoader;
  worklogs: TIssueWorklogIds;
  worklogMap: TIssueWorklogMap;
  totalDurationMap: TIssueWorklogTotals;
  getWorklogsByIssueId: (issueId: string) => string[] | undefined;
  getWorklogById: (worklogId: string) => IWorklog | undefined;
  getTotalDurationByIssueId: (issueId: string) => number | undefined;
}

export class IssueWorklogStore implements IIssueWorklogStore {
  loader: TWorklogLoader = "fetch";
  worklogs: TIssueWorklogIds = {};
  worklogMap: TIssueWorklogMap = {};
  totalDurationMap: TIssueWorklogTotals = {};
  serviceType: TIssueServiceType;
  worklogService: WorklogService;

  constructor(serviceType: TIssueServiceType) {
    makeObservable(this, {
      loader: observable.ref,
      worklogs: observable,
      worklogMap: observable,
      totalDurationMap: observable,
      fetchWorklogs: action,
      createWorklog: action,
      updateWorklog: action,
      removeWorklog: action,
    });

    this.serviceType = serviceType;
    this.worklogService = new WorklogService();
  }

  getWorklogsByIssueId = computedFn((issueId: string) => {
    if (!issueId) return undefined;
    return this.worklogs[issueId] ?? undefined;
  });

  getWorklogById = computedFn((worklogId: string) => {
    if (!worklogId) return undefined;
    return this.worklogMap[worklogId] ?? undefined;
  });

  getTotalDurationByIssueId = computedFn((issueId: string) => {
    if (!issueId) return undefined;
    return this.totalDurationMap[issueId] ?? undefined;
  });

  private canManageWorklogs() {
    return this.serviceType === EIssueServiceType.ISSUES;
  }

  private applyWorklogList(issueId: string, worklogs: IWorklog[], totalDuration: number) {
    this.worklogs[issueId] = worklogs.map((worklog) => worklog.id);
    this.totalDurationMap[issueId] = totalDuration;

    worklogs.forEach((worklog) => {
      set(this.worklogMap, worklog.id, worklog);
    });
  }

  fetchWorklogs = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    loaderType: TWorklogLoader = "fetch"
  ) => {
    if (!this.canManageWorklogs()) return [];

    this.loader = loaderType;

    try {
      const response = await this.worklogService.listWorklogs(workspaceSlug, projectId, issueId);

      runInAction(() => {
        this.applyWorklogList(issueId, response.results ?? [], response.total_duration ?? 0);
        this.loader = undefined;
      });

      return response.results ?? [];
    } catch (error) {
      runInAction(() => {
        this.loader = undefined;
      });
      throw error;
    }
  };

  createWorklog = async (workspaceSlug: string, projectId: string, issueId: string, data: IWorklogCreatePayload) => {
    if (!this.canManageWorklogs()) {
      throw new Error("Worklogs are not supported for this work item.");
    }

    this.loader = "create";
    try {
      const worklog = await this.worklogService.createWorklog(workspaceSlug, projectId, issueId, data);
      await this.fetchWorklogs(workspaceSlug, projectId, issueId, "mutate");
      return worklog;
    } catch (error) {
      runInAction(() => {
        this.loader = undefined;
      });
      throw error;
    }
  };

  updateWorklog = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    worklogId: string,
    data: IWorklogUpdatePayload
  ) => {
    if (!this.canManageWorklogs()) {
      throw new Error("Worklogs are not supported for this work item.");
    }

    this.loader = "update";
    try {
      const worklog = await this.worklogService.updateWorklog(workspaceSlug, projectId, issueId, worklogId, data);
      await this.fetchWorklogs(workspaceSlug, projectId, issueId, "mutate");
      return worklog;
    } catch (error) {
      runInAction(() => {
        this.loader = undefined;
      });
      throw error;
    }
  };

  removeWorklog = async (workspaceSlug: string, projectId: string, issueId: string, worklogId: string) => {
    if (!this.canManageWorklogs()) return;

    this.loader = "delete";
    try {
      await this.worklogService.deleteWorklog(workspaceSlug, projectId, issueId, worklogId);
      await this.fetchWorklogs(workspaceSlug, projectId, issueId, "mutate");
    } catch (error) {
      runInAction(() => {
        this.loader = undefined;
      });
      throw error;
    }
  };
}

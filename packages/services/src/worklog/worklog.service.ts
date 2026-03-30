/**
 * Worklog and Timer API service
 */

import { APIService } from "../api.service";
import type {
  IWorklog,
  IWorklogCreatePayload,
  IWorklogUpdatePayload,
  IWorklogListResponse,
  IActiveTimer,
  ITimerStartPayload,
  ITimerStopPayload,
} from "@plane/types";

export class WorklogService extends APIService {
  constructor() {
    super("");
  }

  // ── Worklog CRUD ──────────────────────────────

  async listWorklogs(
    workspaceSlug: string,
    projectId: string,
    issueId: string
  ): Promise<IWorklogListResponse> {
    return this.get(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/worklogs/`
    ).then((response) => response.data);
  }

  async createWorklog(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    data: IWorklogCreatePayload
  ): Promise<IWorklog> {
    return this.post(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/worklogs/`,
      data
    ).then((response) => response.data);
  }

  async updateWorklog(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    worklogId: string,
    data: IWorklogUpdatePayload
  ): Promise<IWorklog> {
    return this.patch(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/worklogs/${worklogId}/`,
      data
    ).then((response) => response.data);
  }

  async deleteWorklog(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    worklogId: string
  ): Promise<void> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/worklogs/${worklogId}/`
    ).then((response) => response.data);
  }

  // ── Timer ─────────────────────────────────────

  async startTimer(
    workspaceSlug: string,
    data: ITimerStartPayload
  ): Promise<IActiveTimer> {
    return this.post(
      `/api/workspaces/${workspaceSlug}/timer/start/`,
      data
    ).then((response) => response.data);
  }

  async stopTimer(
    workspaceSlug: string,
    data?: ITimerStopPayload
  ): Promise<IWorklog> {
    return this.post(
      `/api/workspaces/${workspaceSlug}/timer/stop/`,
      data ?? {}
    ).then((response) => response.data);
  }

  async getActiveTimer(
    workspaceSlug: string
  ): Promise<IActiveTimer | null> {
    return this.get(
      `/api/workspaces/${workspaceSlug}/timer/active/`
    ).then((response) => response.data);
  }

  async discardTimer(
    workspaceSlug: string
  ): Promise<void> {
    return this.post(
      `/api/workspaces/${workspaceSlug}/timer/discard/`,
      {}
    ).then((response) => response.data);
  }
}

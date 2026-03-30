/**
 * Worklog and Timer types for time tracking
 */

export interface IWorklogUserDetail {
  id: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  avatar_url: string | null;
  display_name: string;
}

export interface IWorklog {
  id: string;
  issue: string;
  user: string;
  project: string;
  workspace: string;
  duration: number; // minutes
  hours: number;
  minutes: number;
  display_duration: string; // "3h 30m"
  description: string;
  logged_at: string;
  source: "manual" | "timer";
  user_detail: IWorklogUserDetail;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string;
  updated_by: string | null;
}

export interface IWorklogCreatePayload {
  hours: number;
  minutes: number;
  description?: string;
}

export interface IWorklogUpdatePayload {
  hours?: number;
  minutes?: number;
  description?: string;
}

export interface IWorklogListResponse {
  results: IWorklog[];
  total_duration: number; // total minutes
  total_display_duration: string; // "7h 35m"
}

export interface IActiveTimer {
  id: string;
  issue: string;
  project: string;
  workspace: string;
  user: string;
  start_time: string;
  elapsed_seconds: number;
  issue_identifier: string; // "PROJ-123"
  created_at: string;
  updated_at: string;
}

export interface ITimerStartPayload {
  issue_id: string;
  project_id: string;
}

export interface ITimerStopPayload {
  description?: string;
}

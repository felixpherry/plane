/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TUserPermissions } from "./enums";
import type { TPaginationInfo } from "./common";
import type { IIssueActivity, TIssuePriorities, TStateGroups } from ".";
import type { IProjectLite } from "./project";
import type { IWorkspaceLite } from "./workspace";
import type { TLoginMediums } from "./instance";

/**
 * @description The start of the week for the user
 * @enum {number}
 */
export enum EStartOfTheWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

export interface IUserLite {
  avatar_url: string;
  display_name: string;
  email?: string;
  first_name: string;
  id: string;
  is_bot: boolean;
  last_name: string;
  joining_date?: string;
}
export interface IUser extends IUserLite {
  // only for uploading the cover image
  cover_image_asset?: string | null;
  cover_image?: string | null;
  // only for rendering the cover image
  cover_image_url: string | null;
  date_joined: string;
  email: string;
  is_active: boolean;
  is_email_verified: boolean;
  is_password_autoset: boolean;
  is_tour_completed: boolean;
  mobile_number: string | null;
  last_workspace_id: string;
  user_timezone: string;
  username: string;
  last_login_medium: TLoginMediums;
  theme: IUserTheme;
}

export interface IUserAccount {
  provider_account_id: string;
  provider: string;
  created_at: Date;
  updated_at: Date;
}

export type TUserProfile = {
  id: string | undefined;
  user: string | undefined;
  role: string | undefined;
  last_workspace_id: string | undefined;
  theme: {
    theme: string | undefined;
    primary: string | undefined;
    background: string | undefined;
    darkPalette: boolean | undefined;
  };
  onboarding_step: TOnboardingSteps;
  is_onboarded: boolean;
  is_tour_completed: boolean;
  use_case: string | undefined;
  billing_address_country: string | undefined;
  billing_address: string | undefined;
  has_billing_address: boolean;
  has_marketing_email_consent: boolean;
  language: string;
  created_at: Date | string;
  updated_at: Date | string;
  start_of_the_week: EStartOfTheWeek;
};

export interface IInstanceAdminStatus {
  is_instance_admin: boolean;
}

export interface IUserSettings {
  id: string | undefined;
  email: string | undefined;
  workspace: {
    last_workspace_id: string | undefined;
    last_workspace_slug: string | undefined;
    last_workspace_name: string | undefined;
    last_workspace_logo: string | undefined;
    fallback_workspace_id: string | undefined;
    fallback_workspace_slug: string | undefined;
    invites: number | undefined;
  };
}

export interface IUserTheme {
  theme: string | undefined; // 'light', 'dark', 'custom', etc.
  primary?: string | undefined;
  background?: string | undefined;
  darkPalette?: boolean | undefined;
}

export interface IUserMemberLite extends IUserLite {
  email?: string;
}

export interface IUserActivity {
  created_date: string;
  activity_count: number;
}

export interface IUserPriorityDistribution {
  priority: TIssuePriorities;
  priority_count: number;
}

export interface IUserStateDistribution {
  state_group: TStateGroups;
  state_count: number;
}

export interface IUserActivityResponse extends TPaginationInfo {
  extra_stats: null;
  grouped_by?: string | null;
  sub_grouped_by?: string | null;
  total_count?: number;
  results: TUserTimelineActivity[];
}

export type IUserTimelineIssueDetail = NonNullable<IIssueActivity["issue_detail"]>;

export interface IUserTimelineActivityBase {
  id: string;
  activity_kind: "issue_activity" | "worklog";
  actor: string | null;
  actor_detail: IUserLite | null;
  issue: string | null;
  issue_detail: IUserTimelineIssueDetail | null;
  project: string;
  project_detail: IProjectLite;
  workspace: string;
  workspace_detail: IWorkspaceLite;
  created_at: string;
  updated_at: string;
}

export interface IUserTimelineIssueActivityPayload {
  attachments: string[];
  comment: string;
  field: string | null;
  issue_comment: string | null;
  new_identifier: string | null;
  new_value: string | null;
  old_identifier: string | null;
  old_value: string | null;
  verb: string;
}

export interface IUserTimelineIssueActivity extends IUserTimelineActivityBase {
  activity_kind: "issue_activity";
  payload: IUserTimelineIssueActivityPayload;
}

export interface IUserTimelineWorklogPayload {
  description: string;
  display_duration: string;
  duration: number;
  hours: number;
  logged_at: string;
  minutes: number;
  source: "manual" | "timer";
}

export interface IUserTimelineWorklogActivity extends IUserTimelineActivityBase {
  activity_kind: "worklog";
  payload: IUserTimelineWorklogPayload;
}

export type TUserTimelineActivity = IUserTimelineIssueActivity | IUserTimelineWorklogActivity;
export type UserAuth = {
  isMember: boolean;
  isOwner: boolean;
  isGuest: boolean;
};

export type TOnboardingSteps = {
  profile_complete: boolean;
  workspace_create: boolean;
  workspace_invite: boolean;
  workspace_join: boolean;
};

export interface IUserProfileData {
  assigned_issues: number;
  completed_issues: number;
  created_issues: number;
  pending_issues: number;
  priority_distribution: IUserPriorityDistribution[];
  state_distribution: IUserStateDistribution[];
  subscribed_issues: number;
}

export interface IUserProfileProjectSegregation {
  project_data: {
    assigned_issues: number;
    completed_issues: number;
    created_issues: number;
    id: string;
    pending_issues: number;
  }[];
  user_data: Pick<IUser, "avatar_url" | "cover_image_url" | "display_name" | "first_name" | "last_name"> & {
    date_joined: Date;
    user_timezone: string;
  };
}

export interface IUserProjectsRole {
  [projectId: string]: TUserPermissions;
}

export interface IUserEmailNotificationSettings {
  property_change: boolean;
  state_change: boolean;
  comment: boolean;
  mention: boolean;
  issue_completed: boolean;
}

export type TProfileViews = "assigned" | "created" | "subscribed";

export type TPublicMember = {
  id: string;
  member: string;
  member__display_name: string;
  member__avatar: string;
};

// export interface ICurrentUser {
//   id: readonly string;
//   avatar: string;
//   first_name: string;
//   last_name: string;
//   username: string;
//   email: string;
//   mobile_number: string;
//   is_email_verified: boolean;
//   is_tour_completed: boolean;
//   onboarding_step: TOnboardingSteps;
//   is_onboarded: boolean;
//   role: string;
// }

// export interface ICustomTheme {
//   background: string;
//   text: string;
//   primary: string;
//   sidebarBackground: string;
//   sidebarText: string;
//   darkPalette: boolean;
//   palette: string;
//   theme: string;
// }

// export interface ICurrentUserSettings {
//   theme: ICustomTheme;
// }

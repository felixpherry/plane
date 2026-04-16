// eslint-disable
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import Link from "next/link";
import { Clock3, History, MessageSquare, Timer } from "lucide-react";
import type {
  IIssueActivity,
  IUserActivityResponse,
  IUserLite,
  IUserTimelineIssueActivity,
  IUserTimelineWorklogActivity,
  TUserTimelineActivity,
} from "@plane/types";
import { calculateTimeAgo, generateWorkItemLink, getFileURL } from "@plane/utils";
import { ActivityIcon, ActivityMessage, IssueLink } from "@/components/core/activity";
import { RichTextEditor } from "@/components/editor/rich-text";

const FALLBACK_ACTOR_DETAIL: IUserLite = {
  id: "",
  first_name: "Plane",
  last_name: "",
  avatar_url: "",
  display_name: "Plane",
  is_bot: false,
};

const getActorDetail = (activity: TUserTimelineActivity): IUserLite => activity.actor_detail ?? FALLBACK_ACTOR_DETAIL;

const isIssueActivity = (activity: TUserTimelineActivity): activity is IUserTimelineIssueActivity =>
  activity.activity_kind === "issue_activity";

const isWorklogActivity = (activity: TUserTimelineActivity): activity is IUserTimelineWorklogActivity =>
  activity.activity_kind === "worklog";

const toLegacyIssueActivity = (activity: IUserTimelineIssueActivity): IIssueActivity => ({
  actor: activity.actor ?? "",
  actor_detail: getActorDetail(activity),
  attachments: activity.payload.attachments,
  comment: activity.payload.comment,
  created_at: activity.created_at as unknown as Date,
  created_by: activity.actor ?? "",
  field: activity.payload.field,
  id: activity.id,
  issue: activity.issue,
  issue_comment: activity.payload.issue_comment,
  issue_detail: activity.issue_detail,
  new_identifier: activity.payload.new_identifier,
  new_value: activity.payload.new_value,
  old_identifier: activity.payload.old_identifier,
  old_value: activity.payload.old_value,
  project: activity.project,
  project_detail: activity.project_detail,
  updated_at: activity.updated_at as unknown as Date,
  updated_by: activity.actor ?? "",
  verb: activity.payload.verb,
  workspace: activity.workspace,
  workspace_detail: activity.workspace_detail,
});

const renderActorLabel = (activity: TUserTimelineActivity, currentUserId?: string) => {
  const actorDetail = getActorDetail(activity);

  if (currentUserId && actorDetail.id === currentUserId) {
    return <span className="text-gray font-medium">You</span>;
  }

  if (actorDetail.is_bot) {
    return <span className="text-gray font-medium">{actorDetail.first_name} Bot</span>;
  }

  if (actorDetail.id && activity.workspace_detail?.slug) {
    return (
      <Link href={`/${activity.workspace_detail.slug}/profile/${actorDetail.id}`} className="inline">
        <span className="text-gray font-medium">{actorDetail.display_name}</span>
      </Link>
    );
  }

  return <span className="text-gray font-medium">{actorDetail.display_name}</span>;
};

const renderActorAvatar = (activity: TUserTimelineActivity, className: string, fallbackClassName: string) => {
  const actorDetail = getActorDetail(activity);

  if (actorDetail.avatar_url && actorDetail.avatar_url !== "") {
    return (
      <img
        src={getFileURL(actorDetail.avatar_url)}
        alt={actorDetail.display_name}
        height={24}
        width={24}
        className={className}
      />
    );
  }

  return <div className={fallbackClassName}>{actorDetail.display_name?.[0]}</div>;
};

const renderWorklogIssue = (activity: IUserTimelineWorklogActivity) => {
  if (!activity.issue_detail) {
    return <span className="font-medium text-primary">a work item</span>;
  }

  const workItemLink = generateWorkItemLink({
    workspaceSlug: activity.workspace_detail?.slug,
    projectId: activity.project,
    issueId: activity.issue,
    projectIdentifier: activity.project_detail?.identifier,
    sequenceId: activity.issue_detail.sequence_id,
  });

  return (
    <a
      href={workItemLink}
      target="_blank"
      rel="noopener noreferrer"
      className="inline items-center gap-1 font-medium text-primary hover:underline"
    >
      <span className="whitespace-nowrap">{`${activity.project_detail.identifier}-${activity.issue_detail.sequence_id}`}</span>{" "}
      <span className="font-regular break-all">{activity.issue_detail.name}</span>
    </a>
  );
};

function WorklogTimelineActivityRow(props: {
  activity: IUserTimelineWorklogActivity;
  currentUserId?: string;
  compact?: boolean;
}) {
  const { activity, currentUserId, compact = false } = props;
  const actorDetail = getActorDetail(activity);
  const sourceLabel = activity.payload.source === "timer" ? "Timer entry" : "Manual entry";
  const sourceIcon =
    activity.payload.source === "timer" ? (
      <Timer className="h-4 w-4 text-secondary" aria-hidden="true" />
    ) : (
      <Clock3 className="h-4 w-4 text-secondary" aria-hidden="true" />
    );

  if (compact) {
    return (
      <div className="flex gap-3">
        <div className="grid h-6 w-6 flex-shrink-0 place-items-center overflow-hidden rounded-sm border border-subtle shadow-raised-100">
          {sourceIcon}
        </div>
        <div className="-mt-1 w-4/5 break-words">
          <p className="inline text-13 text-secondary">
            <span className="font-medium text-primary">
              {currentUserId && actorDetail.id === currentUserId ? "You" : actorDetail.display_name}{" "}
            </span>
            logged <span className="font-medium text-primary">{activity.payload.display_duration}</span> on{" "}
            {renderWorklogIssue(activity)}
          </p>
          <p className="text-11 whitespace-nowrap text-secondary">
            {sourceLabel} {calculateTimeAgo(activity.created_at)}
          </p>
          {activity.payload.description && (
            <p className="mt-1 line-clamp-2 text-11 text-secondary">{activity.payload.description}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <li>
      <div className="relative pb-1">
        <div className="relative flex items-start space-x-2">
          <div>
            <div className="relative mt-4 px-1.5">
              <div className="mt-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-subtle shadow-raised-100">
                  {sourceIcon}
                </div>
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 border-b border-subtle py-4">
            <div className="text-caption-md-regular break-words text-secondary">
              {renderActorLabel(activity, currentUserId)}{" "}
              <div className="inline gap-1">
                logged <span className="font-medium text-primary">{activity.payload.display_duration}</span> on{" "}
                {renderWorklogIssue(activity)}{" "}
                <span className="flex-shrink-0 whitespace-nowrap">{calculateTimeAgo(activity.created_at)}</span>
              </div>
            </div>
            <div className="mt-1 text-11 text-secondary">{sourceLabel}</div>
            {activity.payload.description && (
              <div className="mt-2 max-w-2xl text-12 text-secondary">{activity.payload.description}</div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function IssueTimelineActivityRow(props: { activity: IUserTimelineIssueActivity; currentUserId?: string }) {
  const { activity, currentUserId } = props;
  const legacyActivity = toLegacyIssueActivity(activity);
  const actorDetail = getActorDetail(activity);

  if (legacyActivity.field === "comment") {
    return (
      <div key={legacyActivity.id} className="mt-2">
        <div className="relative flex items-start space-x-3">
          <div className="relative px-1">
            {legacyActivity.field
              ? legacyActivity.new_value === "restore" && <History className="h-3.5 w-3.5 text-secondary" />
              : renderActorAvatar(
                  activity,
                  "grid h-7 w-7 place-items-center rounded-full border-2 border-subtle-1 bg-layer-3",
                  "grid h-7 w-7 place-items-center rounded-full border-2 border-subtle-1 bg-layer-3 capitalize"
                )}

            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-layer-3 p-2 text-secondary">
              <MessageSquare className="!text-20 text-secondary" aria-hidden="true" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div>
              <div className="text-11">
                {actorDetail.is_bot ? `${actorDetail.first_name} Bot` : actorDetail.display_name}
              </div>
              <p className="mt-0.5 text-11 text-secondary">Commented {calculateTimeAgo(legacyActivity.created_at)}</p>
            </div>
            <div className="issue-comments-section p-0">
              <RichTextEditor
                editable={false}
                id={legacyActivity.id}
                initialValue={
                  legacyActivity?.new_value !== ""
                    ? (legacyActivity.new_value?.toString() as string)
                    : (legacyActivity.old_value?.toString() as string)
                }
                containerClassName="text-11 bg-surface-1"
                workspaceId={legacyActivity?.workspace_detail?.id?.toString() ?? ""}
                workspaceSlug={legacyActivity?.workspace_detail?.slug?.toString() ?? ""}
                projectId={legacyActivity.project}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if ("field" in legacyActivity && legacyActivity.field !== "updated_by") {
    return (
      <li key={legacyActivity.id}>
        <div className="relative pb-1">
          <div className="relative flex items-start space-x-2">
            <div>
              <div className="relative mt-4 px-1.5">
                <div className="mt-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-subtle shadow-raised-100">
                    {legacyActivity.field ? (
                      legacyActivity.new_value === "restore" ? (
                        <History className="h-5 w-5 text-secondary" />
                      ) : (
                        <ActivityIcon activity={legacyActivity} />
                      )
                    ) : (
                      renderActorAvatar(
                        activity,
                        "h-full w-full rounded-full object-cover",
                        "grid h-6 w-6 place-items-center rounded-full border-2 border-subtle-1 bg-layer-3 text-11 capitalize"
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1 border-b border-subtle py-4">
              <div className="text-caption-md-regular break-words text-secondary">
                {legacyActivity.field === "archived_at" && legacyActivity.new_value !== "restore" ? (
                  <span className="text-gray font-medium">Plane</span>
                ) : (
                  renderActorLabel(activity, currentUserId)
                )}{" "}
                <div className="inline gap-1">
                  <ActivityMessage activity={legacyActivity} showIssue />{" "}
                  <span className="flex-shrink-0 whitespace-nowrap">{calculateTimeAgo(legacyActivity.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </li>
    );
  }

  return null;
}

function IssuePreviewActivityRow(props: { activity: IUserTimelineIssueActivity; currentUserId?: string }) {
  const { activity, currentUserId } = props;
  const legacyActivity = toLegacyIssueActivity(activity);
  const actorDetail = getActorDetail(activity);

  return (
    <div className="flex gap-3">
      <div className="grid h-6 w-6 flex-shrink-0 place-items-center overflow-hidden rounded-sm">
        {!legacyActivity.field ? (
          renderActorAvatar(
            activity,
            "rounded-sm",
            "grid h-6 w-6 place-items-center rounded-sm border-2 border-strong text-11 text-on-color"
          )
        ) : (
          <div className="grid h-6 w-6 place-items-center rounded-sm border border-subtle shadow-raised-100">
            <ActivityIcon activity={legacyActivity} />
          </div>
        )}
      </div>
      <div className="-mt-1 w-4/5 break-words">
        <p className="inline text-13 text-secondary">
          <span className="font-medium text-primary">
            {currentUserId && actorDetail.id === currentUserId ? "You" : actorDetail.display_name}{" "}
          </span>
          {legacyActivity.field ? (
            <ActivityMessage activity={legacyActivity} showIssue />
          ) : (
            <span>
              created <IssueLink activity={legacyActivity} />
            </span>
          )}
        </p>
        <p className="text-11 whitespace-nowrap text-secondary">{calculateTimeAgo(legacyActivity.created_at)}</p>
      </div>
    </div>
  );
}

export function UserActivityResultsList(props: { activity: IUserActivityResponse; currentUserId?: string }) {
  const { activity, currentUserId } = props;

  return (
    <ul role="list">
      {activity.results.map((activityItem) =>
        isWorklogActivity(activityItem) ? (
          <WorklogTimelineActivityRow key={activityItem.id} activity={activityItem} currentUserId={currentUserId} />
        ) : isIssueActivity(activityItem) ? (
          <IssueTimelineActivityRow key={activityItem.id} activity={activityItem} currentUserId={currentUserId} />
        ) : null
      )}
    </ul>
  );
}

export function UserActivityPreviewList(props: { activity: IUserActivityResponse; currentUserId?: string }) {
  const { activity, currentUserId } = props;

  return (
    <div className="space-y-5">
      {activity.results.map((activityItem) =>
        isWorklogActivity(activityItem) ? (
          <WorklogTimelineActivityRow
            key={activityItem.id}
            activity={activityItem}
            currentUserId={currentUserId}
            compact
          />
        ) : isIssueActivity(activityItem) ? (
          <IssuePreviewActivityRow key={activityItem.id} activity={activityItem} currentUserId={currentUserId} />
        ) : null
      )}
    </div>
  );
}

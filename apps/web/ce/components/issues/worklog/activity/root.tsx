/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import Link from "next/link";
import { Clock3, Timer } from "lucide-react";
import { Tooltip } from "@plane/propel/tooltip";
import { calculateTimeAgo, renderFormattedDate, renderFormattedTime } from "@plane/utils";
import type { TIssueActivityComment } from "@plane/types";
import { usePlatformOS } from "@/hooks/use-platform-os";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { formatWorklogDuration, getWorklogSourceLabel } from "../helpers";

type TIssueActivityWorklog = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  activityComment: TIssueActivityComment;
  ends?: "top" | "bottom";
};

export function IssueActivityWorklog(props: TIssueActivityWorklog) {
  const { workspaceSlug, activityComment, ends } = props;
  const {
    worklog: { getWorklogById },
  } = useIssueDetail();
  const { isMobile } = usePlatformOS();

  const worklog = getWorklogById(activityComment.id);
  if (!worklog) return <></>;

  const sourceLabel = getWorklogSourceLabel(worklog.source);

  return (
    <div
      className={`relative flex items-center gap-3 text-caption-sm-regular ${
        ends === "top" ? "pb-2" : ends === "bottom" ? "pt-2" : "py-2"
      }`}
    >
      <div
        className={`absolute left-[13px] w-px bg-layer-3 ${ends === "bottom" ? "top-0 h-[14px]" : "top-0 bottom-0"}`}
        aria-hidden
      />
      <div className="z-[4] flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-subtle bg-layer-2 text-secondary shadow-raised-100">
        {worklog.source === "timer" ? (
          <Timer className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1 break-words text-secondary">
        {worklog.user_detail.id ? (
          <Link
            href={`/${workspaceSlug}/profile/${worklog.user_detail.id}`}
            className="font-medium text-primary hover:underline"
          >
            {worklog.user_detail.display_name}
          </Link>
        ) : (
          <span className="font-medium text-primary">{worklog.user_detail.display_name}</span>
        )}{" "}
        logged{" "}
        <span className="font-medium text-primary">
          {worklog.display_duration || formatWorklogDuration(worklog.duration)}
        </span>{" "}
        via <span className="font-medium text-primary">{sourceLabel}</span>.
        <Tooltip
          isMobile={isMobile}
          tooltipContent={`${renderFormattedDate(worklog.created_at)}, ${renderFormattedTime(worklog.created_at)}`}
        >
          <span className="whitespace-nowrap text-tertiary"> {calculateTimeAgo(worklog.created_at)}</span>
        </Tooltip>
      </div>
    </div>
  );
}

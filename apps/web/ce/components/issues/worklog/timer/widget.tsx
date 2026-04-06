"use client";

/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import Link from "next/link";
import { Square, Timer, Trash2 } from "lucide-react";
import { Button } from "@plane/ui";
import { useGlobalWorklogTimer } from "./context";
import { IssueIdentifier } from "../../issue-details";

function formatSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const neutralPrimaryLinkClasses =
  "text-secondary bg-surface-1 border border-subtle hover:bg-surface-2 focus:text-tertiary focus:bg-surface-2 px-3 py-1.5 font-medium text-11 rounded-sm flex items-center gap-1.5 whitespace-nowrap transition-all justify-center no-underline";

export const FloatingWorklogTimerWidget = observer(function FloatingWorklogTimerWidget() {
  const {
    activeTimer,
    activeIssue,
    workItemLink,
    elapsedSeconds,
    isInitializing,
    isMutating,
    error,
    stopTimer,
    discardTimer,
  } = useGlobalWorklogTimer();

  if (isInitializing && !activeTimer) return null;
  if (!activeTimer || !activeIssue) return null;

  const issueTitle = activeIssue?.name ?? activeTimer.issue_identifier ?? "Tracked issue";
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 flex w-120 max-w-sm -translate-x-1/2 flex-col justify-end">
      <div className="shadow-lg pointer-events-auto flex w-full flex-col gap-2 rounded-xl border border-subtle bg-surface-1 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-subtle bg-surface-2 text-primary">
              <Timer className="size-6" />
            </div>
            <p className="text-body-md-semibold">Time tracker</p>
          </div>
          <div className="ml-auto">
            {workItemLink ? (
              <Link href={workItemLink} className={neutralPrimaryLinkClasses}>
                View Details
              </Link>
            ) : (
              <span
                className={`${neutralPrimaryLinkClasses} cursor-not-allowed opacity-60`}
                aria-disabled="true"
                tabIndex={-1}
              >
                View Details
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IssueIdentifier
            issueId={activeIssue.id}
            issueSequenceId={activeIssue.sequence_id}
            projectId={activeIssue.project_id!}
          />
          <div className="truncate text-body-sm-semibold text-primary">{issueTitle}</div>
        </div>

        <div className="font-mono text-24 font-semibold text-primary">{formatSeconds(elapsedSeconds)}</div>
        {error && <div className="mt-2 text-body-xs-medium text-red-500">{error}</div>}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline-danger"
            size="sm"
            className="flex-1"
            prependIcon={<Trash2 className="h-3 w-3" />}
            onClick={() => void discardTimer()}
            disabled={isMutating}
          >
            Discard
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            prependIcon={<Square className="h-3 w-3" />}
            onClick={() => void stopTimer()}
            loading={isMutating}
          >
            Stop
          </Button>
        </div>
      </div>
    </div>
  );
});

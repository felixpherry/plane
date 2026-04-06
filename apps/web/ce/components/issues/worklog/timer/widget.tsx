"use client";

/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Square, Timer, Trash2 } from "lucide-react";
import { Button, cn } from "@plane/ui";
import { useGlobalWorklogTimer } from "./context";
import { IssueIdentifier } from "../../issue-details";

const COMPACT_WIDGET_WIDTH = 144;
const COMPACT_WIDGET_HEIGHT = 48;
const EXPANDED_WIDGET_WIDTH = 320;

const shellTransition = {
  type: "spring",
  duration: 0.36,
  bounce: 0.08,
} as const;

function formatSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const neutralPrimaryLinkClasses =
  "text-secondary bg-surface-1 border border-subtle hover:bg-surface-2 focus:text-tertiary focus:bg-surface-2 px-3 py-1.5 font-medium text-11 rounded-sm flex items-center gap-1.5 whitespace-nowrap transition-all justify-center no-underline";

function TimerActionLink({ workItemLink }: { workItemLink: string | null }) {
  if (workItemLink) {
    return (
      <Link href={workItemLink} className={neutralPrimaryLinkClasses}>
        View Details
      </Link>
    );
  }

  return (
    <span className={`${neutralPrimaryLinkClasses} cursor-not-allowed opacity-60`} aria-disabled="true" tabIndex={-1}>
      View Details
    </span>
  );
}

export const FloatingWorklogTimerWidget = observer(function FloatingWorklogTimerWidget() {
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState(COMPACT_WIDGET_HEIGHT);
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

  useEffect(() => {
    if (!isExpanded) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (widgetRef.current?.contains(target)) return;
      setIsExpanded(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isExpanded]);

  useLayoutEffect(() => {
    const content = contentRef.current;

    if (!content) {
      return undefined;
    }

    const updateHeight = () => {
      const nextHeight = Math.ceil(content.getBoundingClientRect().height);
      if (nextHeight > COMPACT_WIDGET_HEIGHT) {
        setExpandedHeight(nextHeight);
      }
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
    };
  }, [error, isExpanded]);

  if (isInitializing && !activeTimer) return null;
  if (!activeTimer || !activeIssue) return null;

  const issueTitle = activeIssue.name ?? activeTimer.issue_identifier ?? "Tracked issue";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center">
      <motion.div
        ref={widgetRef}
        className={cn(
          "shadow-lg pointer-events-auto overflow-hidden border border-subtle-1 bg-surface-1",
          isExpanded ? "cursor-default" : "cursor-pointer",
          "rounded-sm!"
        )}
        animate={{
          width: isExpanded ? EXPANDED_WIDGET_WIDTH : COMPACT_WIDGET_WIDTH,
          height: isExpanded ? expandedHeight : COMPACT_WIDGET_HEIGHT,
        }}
        transition={shellTransition}
        onClick={() => {
          if (!isExpanded) {
            setIsExpanded(true);
          }
        }}
      >
        <motion.div
          ref={contentRef}
          className="flex w-full flex-col"
          animate={{
            paddingTop: isExpanded ? 12 : 8,
            paddingRight: isExpanded ? 16 : 12,
            paddingBottom: isExpanded ? 12 : 8,
            paddingLeft: isExpanded ? 16 : 12,
            gap: isExpanded ? 8 : 0,
          }}
          transition={shellTransition}
        >
          <div className={`flex min-h-8 items-center ${isExpanded ? "justify-between gap-3" : "gap-2"}`}>
            <motion.div
              className="flex shrink-0 items-center justify-center rounded-full! bg-accent-primary text-on-color"
              animate={{
                width: isExpanded ? 40 : 32,
                height: isExpanded ? 40 : 32,
              }}
              transition={shellTransition}
            >
              <Timer className={isExpanded ? "size-6" : "size-4"} />
            </motion.div>

            <div className="relative flex min-w-0 flex-1 items-center">
              {isExpanded ? (
                <p className="truncate text-body-md-semibold text-primary">Time tracker</p>
              ) : (
                <div className="font-mono text-18 font-semibold text-primary">{formatSeconds(elapsedSeconds)}</div>
              )}
            </div>

            <AnimatePresence initial={false}>
              {isExpanded ? (
                <motion.div
                  key="view-details"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { delay: 0.1, duration: 0.18 },
                  }}
                  exit={{ opacity: 0, x: 12, transition: { duration: 0.12 } }}
                  className="ml-auto flex shrink-0"
                >
                  <TimerActionLink workItemLink={workItemLink} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <AnimatePresence initial={false}>
            {isExpanded ? (
              <motion.div
                key="expanded-content"
                initial={{ opacity: 0, y: -10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: 0.08, duration: 0.18 },
                }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <IssueIdentifier
                    issueId={activeIssue.id}
                    issueSequenceId={activeIssue.sequence_id}
                    projectId={activeIssue.project_id!}
                  />
                  <div className="truncate text-body-sm-semibold text-primary">{issueTitle}</div>
                </div>

                <div className="font-mono text-24 font-semibold text-primary">{formatSeconds(elapsedSeconds)}</div>

                <AnimatePresence initial={false}>
                  {error ? (
                    <motion.div
                      key="timer-error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden text-body-xs-medium text-red-500"
                    >
                      {error}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

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
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
});

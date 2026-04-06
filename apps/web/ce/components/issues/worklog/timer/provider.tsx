"use client";

/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { StoreContext } from "@/lib/store-context";
import { IssueService } from "@/services/issue";
import { WorklogService } from "@plane/services";
import type { IActiveTimer, ITimerStartResponse, IWorklog } from "@plane/types";
import { generateWorkItemLink } from "@plane/utils";
import { GlobalWorklogTimerContext } from "./context";
import { FloatingWorklogTimerWidget } from "./widget";

const worklogService = new WorklogService();
const issueService = new IssueService();

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "error" in error.response.data &&
    typeof error.response.data.error === "string" &&
    error.response.data.error.trim().length > 0
  ) {
    return error.response.data.error;
  }

  return fallback;
};

export const GlobalWorklogTimerProvider = observer(function GlobalWorklogTimerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { workspaceSlug } = useParams();
  const rootStore = useContext(StoreContext);
  const workspaceSlugValue = workspaceSlug?.toString();
  const [activeTimer, setActiveTimer] = useState<IActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isActiveIssueLoading, setIsActiveIssueLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastStoppedWorklog, setLastStoppedWorklog] = useState<IWorklog | null>(null);
  const activeIssueRequestRef = useRef(0);

  const applyActiveTimer = useCallback((timer: IActiveTimer | null) => {
    setActiveTimer(timer);
    setElapsedSeconds(timer?.elapsed_seconds ?? 0);
  }, []);

  const clearActiveTimer = useCallback(() => {
    setActiveTimer(null);
    setElapsedSeconds(0);
  }, []);

  const clearActiveIssue = useCallback(() => {
    activeIssueRequestRef.current += 1;
    setIsActiveIssueLoading(false);
  }, []);

  const cachedActiveIssue = activeTimer ? (rootStore.issue.issues.getIssueById(activeTimer.issue) ?? null) : null;
  const activeProjectIdentifier = cachedActiveIssue
    ? rootStore.projectRoot.project.getProjectIdentifierById(cachedActiveIssue.project_id)
    : undefined;
  const workItemLink = activeTimer
    ? workspaceSlugValue && activeProjectIdentifier && cachedActiveIssue
      ? generateWorkItemLink({
          workspaceSlug: workspaceSlugValue,
          projectId: cachedActiveIssue.project_id,
          issueId: cachedActiveIssue.id,
          projectIdentifier: activeProjectIdentifier,
          sequenceId: cachedActiveIssue.sequence_id,
        })
      : activeTimer.issue_identifier
        ? `/${workspaceSlugValue}/browse/${activeTimer.issue_identifier}/`
        : null
    : null;

  const refreshActiveTimer = useCallback(async (): Promise<IActiveTimer | null> => {
    if (!workspaceSlug) {
      setIsInitializing(false);
      clearActiveTimer();
      clearActiveIssue();
      return null;
    }

    setIsInitializing(true);
    try {
      const timer = await worklogService.getActiveTimer(workspaceSlug);
      setError(null);
      applyActiveTimer(timer);
      return timer;
    } catch (refreshError) {
      setError(getErrorMessage(refreshError, "Failed to load active timer."));
      clearActiveTimer();
      clearActiveIssue();
      throw refreshError;
    } finally {
      setIsInitializing(false);
    }
  }, [applyActiveTimer, clearActiveTimer, clearActiveIssue, workspaceSlug]);

  const resolveActiveIssue = useCallback(async () => {
    if (!workspaceSlug || !activeTimer) {
      clearActiveIssue();
      return;
    }

    if (cachedActiveIssue) {
      clearActiveIssue();
      return;
    }

    const requestId = ++activeIssueRequestRef.current;
    setIsActiveIssueLoading(true);

    try {
      const issue = await issueService.retrieve(workspaceSlug, activeTimer.project, activeTimer.issue);
      rootStore.issue.issues.addIssue([issue]);
    } catch (issueError) {
      console.error("Failed to resolve active timer issue:", issueError);
    } finally {
      if (activeIssueRequestRef.current === requestId) {
        setIsActiveIssueLoading(false);
      }
    }
  }, [activeTimer, cachedActiveIssue, clearActiveIssue, rootStore, workspaceSlug]);

  useEffect(() => {
    setLastStoppedWorklog(null);
    setError(null);
    clearActiveTimer();
    clearActiveIssue();

    void refreshActiveTimer().catch(() => {
      // The provider keeps its own error state for rendering.
    });
  }, [clearActiveIssue, clearActiveTimer, refreshActiveTimer]);

  useEffect(() => {
    if (!activeTimer) return undefined;

    const interval = setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  useEffect(() => {
    void resolveActiveIssue();
  }, [resolveActiveIssue]);

  const activeIssue = cachedActiveIssue;

  const startTimer = useCallback(
    async ({ issueId, projectId }: { issueId: string; projectId: string }): Promise<ITimerStartResponse> => {
      if (!workspaceSlug) throw new Error("Workspace slug is required to start a timer.");

      setIsMutating(true);
      try {
        const response = await worklogService.startTimer(workspaceSlug, {
          issue_id: issueId,
          project_id: projectId,
        });

        setError(null);
        setLastStoppedWorklog(response.stopped_worklog ?? null);
        applyActiveTimer(response.active_timer);
        clearActiveIssue();

        return response;
      } catch (startError) {
        setError(getErrorMessage(startError, "Failed to start timer."));
        throw startError;
      } finally {
        setIsMutating(false);
      }
    },
    [applyActiveTimer, clearActiveIssue, workspaceSlug]
  );

  const stopTimer = useCallback(
    async ({ description = "" }: { description?: string } = {}): Promise<IWorklog> => {
      if (!workspaceSlug) throw new Error("Workspace slug is required to stop a timer.");

      setIsMutating(true);
      try {
        const worklog = await worklogService.stopTimer(workspaceSlug, {
          description,
        });
        setError(null);
        setLastStoppedWorklog(worklog);
        clearActiveTimer();
        clearActiveIssue();

        return worklog;
      } catch (stopError) {
        setError(getErrorMessage(stopError, "Failed to stop timer."));
        throw stopError;
      } finally {
        setIsMutating(false);
      }
    },
    [clearActiveTimer, clearActiveIssue, workspaceSlug]
  );

  const discardTimer = useCallback(async (): Promise<void> => {
    if (!workspaceSlug) throw new Error("Workspace slug is required to discard a timer.");

    setIsMutating(true);
    try {
      await worklogService.discardTimer(workspaceSlug);
      setError(null);
      setLastStoppedWorklog(null);
      clearActiveTimer();
      clearActiveIssue();
    } catch (discardError) {
      setError(getErrorMessage(discardError, "Failed to discard timer."));
      throw discardError;
    } finally {
      setIsMutating(false);
    }
  }, [clearActiveTimer, clearActiveIssue, workspaceSlug]);

  const isActiveForIssue = useCallback(
    (issueId: string) => {
      if (!activeTimer) return false;
      return activeTimer.issue === issueId;
    },
    [activeTimer]
  );

  const value = useMemo(
    () => ({
      activeTimer,
      activeIssue,
      workItemLink,
      elapsedSeconds,
      isInitializing,
      isActiveIssueLoading,
      isMutating,
      error,
      lastStoppedWorklog,
      refreshActiveTimer,
      startTimer,
      stopTimer,
      discardTimer,
      isActiveForIssue,
    }),
    [
      activeTimer,
      activeIssue,
      workItemLink,
      elapsedSeconds,
      isInitializing,
      isActiveIssueLoading,
      isMutating,
      error,
      lastStoppedWorklog,
      refreshActiveTimer,
      startTimer,
      stopTimer,
      discardTimer,
      isActiveForIssue,
    ]
  );

  return (
    <GlobalWorklogTimerContext.Provider value={value}>
      {children}
      <FloatingWorklogTimerWidget />
    </GlobalWorklogTimerContext.Provider>
  );
});

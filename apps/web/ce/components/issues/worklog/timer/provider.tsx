// eslint-disable
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
import { setToast, TOAST_TYPE } from "@plane/propel/toast";
import { StoreContext } from "@/lib/store-context";
import { IssueService } from "@/services/issue";
import { WorklogService } from "@plane/services";
import type { IActiveTimer, ITimerStartResponse, IWorklog } from "@plane/types";
import { generateWorkItemLink } from "@plane/utils";
import { GlobalWorklogTimerContext } from "./context";
import { FloatingWorklogTimerWidget } from "./widget";

const worklogService = new WorklogService();
const issueService = new IssueService();
const TIMER_LEASE_STORAGE_KEY = "plane.worklog.timer.lease-token";
const TIMER_BROADCAST_CHANNEL = "plane.worklog.timer";
const HEARTBEAT_INTERVAL_MS = 5000;
const LEADER_PING_INTERVAL_MS = 1000;
const LEADER_STALE_MS = 3500;
const LEADER_CLAIM_DELAY_MS = 1500;
const LEADER_CHECK_INTERVAL_MS = 1000;

const getElapsedSecondsFromStartTime = (startTime: string): number => {
  const startedAt = new Date(startTime).getTime();

  if (Number.isNaN(startedAt)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
};

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

const showTimerToast = (type: TOAST_TYPE.SUCCESS | TOAST_TYPE.ERROR, title: string, message: string): void => {
  setToast({
    type,
    title,
    message,
  });
};

const createTabId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const readStoredLeaseToken = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(TIMER_LEASE_STORAGE_KEY);
  } catch {
    return null;
  }
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
  const tabIdRef = useRef(createTabId());
  const leaseTokenRef = useRef<string | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const leaderPingRef = useRef<number | null>(null);
  const leaderCheckRef = useRef<number | null>(null);
  const claimTimeoutRef = useRef<number | null>(null);
  const leaderSeenAtRef = useRef(0);
  const isLocalLeaderRef = useRef(false);

  const applyActiveTimer = useCallback((timer: IActiveTimer | null) => {
    setActiveTimer(timer);
    setElapsedSeconds(timer ? getElapsedSecondsFromStartTime(timer.start_time) : 0);
  }, []);

  const clearActiveTimer = useCallback(() => {
    setActiveTimer(null);
    setElapsedSeconds(0);
  }, []);

  const clearActiveIssue = useCallback(() => {
    activeIssueRequestRef.current += 1;
    setIsActiveIssueLoading(false);
  }, []);

  const stopLocalHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    if (leaderPingRef.current) {
      window.clearInterval(leaderPingRef.current);
      leaderPingRef.current = null;
    }
  }, []);

  const stopLeaderWatcher = useCallback(() => {
    if (leaderCheckRef.current) {
      window.clearInterval(leaderCheckRef.current);
      leaderCheckRef.current = null;
    }

    if (claimTimeoutRef.current) {
      window.clearTimeout(claimTimeoutRef.current);
      claimTimeoutRef.current = null;
    }
  }, []);

  const clearLocalLeadership = useCallback(() => {
    isLocalLeaderRef.current = false;
    leaderSeenAtRef.current = 0;
    stopLocalHeartbeat();
    stopLeaderWatcher();
  }, [stopLeaderWatcher, stopLocalHeartbeat]);

  const persistLeaseToken = useCallback((leaseToken: string | null) => {
    leaseTokenRef.current = leaseToken;

    if (typeof window === "undefined") return;

    try {
      if (leaseToken) {
        window.localStorage.setItem(TIMER_LEASE_STORAGE_KEY, leaseToken);
      } else {
        window.localStorage.removeItem(TIMER_LEASE_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures. The timer can still run until refresh.
    }
  }, []);

  const broadcastLeaderState = useCallback((type: "leader-alive" | "leader-release") => {
    const channel = broadcastRef.current;
    if (!channel) return;

    channel.postMessage({
      type,
      tabId: tabIdRef.current,
      timestamp: Date.now(),
    });
  }, []);

  const cachedActiveIssue = activeTimer ? (rootStore.issue.issues.getIssueById(activeTimer.issue) ?? null) : null;
  const activeProjectIdentifier = cachedActiveIssue
    ? rootStore.projectRoot.project.getProjectIdentifierById(cachedActiveIssue.project_id)
    : undefined;
  const activeWorkspace = activeTimer ? rootStore.workspaceRoot.getWorkspaceById(activeTimer.workspace) : null;
  const activeWorkspaceSlug = activeWorkspace?.slug ?? workspaceSlugValue;
  const workItemLink = activeTimer
    ? activeWorkspaceSlug && activeProjectIdentifier && cachedActiveIssue
      ? generateWorkItemLink({
          workspaceSlug: activeWorkspaceSlug,
          projectId: cachedActiveIssue.project_id,
          issueId: cachedActiveIssue.id,
          projectIdentifier: activeProjectIdentifier,
          sequenceId: cachedActiveIssue.sequence_id,
        })
      : activeTimer.issue_identifier && activeWorkspaceSlug
        ? `/${activeWorkspaceSlug}/browse/${activeTimer.issue_identifier}/`
        : null
    : null;

  const refreshActiveTimer = useCallback(async (): Promise<IActiveTimer | null> => {
    if (!workspaceSlugValue) {
      setIsInitializing(false);
      clearActiveTimer();
      clearActiveIssue();
      persistLeaseToken(null);
      clearLocalLeadership();
      return null;
    }

    setIsInitializing(true);
    try {
      const timer = await worklogService.getActiveTimer(workspaceSlugValue);
      setError(null);
      applyActiveTimer(timer);
      if (!timer) {
        persistLeaseToken(null);
        broadcastLeaderState("leader-release");
        clearLocalLeadership();
      }
      return timer;
    } catch (refreshError) {
      setError(getErrorMessage(refreshError, "Failed to load active timer."));
      clearActiveTimer();
      clearActiveIssue();
      throw refreshError;
    } finally {
      setIsInitializing(false);
    }
  }, [
    applyActiveTimer,
    broadcastLeaderState,
    clearActiveIssue,
    clearActiveTimer,
    clearLocalLeadership,
    persistLeaseToken,
    workspaceSlugValue,
  ]);

  const resolveActiveIssue = useCallback(async () => {
    if (!activeTimer || !activeWorkspaceSlug) {
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
      const issue = await issueService.retrieve(activeWorkspaceSlug, activeTimer.project, activeTimer.issue);
      rootStore.issue.issues.addIssue([issue]);
    } catch (issueError) {
      console.error("Failed to resolve active timer issue:", issueError);
    } finally {
      if (activeIssueRequestRef.current === requestId) {
        setIsActiveIssueLoading(false);
      }
    }
  }, [activeTimer, activeWorkspaceSlug, cachedActiveIssue, clearActiveIssue, rootStore]);

  const handleHeartbeatFailure = useCallback(
    (heartbeatError: unknown) => {
      setError(getErrorMessage(heartbeatError, "Failed to renew timer lease."));
      persistLeaseToken(null);
      broadcastLeaderState("leader-release");
      clearLocalLeadership();
      clearActiveTimer();
      clearActiveIssue();

      void refreshActiveTimer().catch(() => {
        // The provider keeps its own error state for rendering.
      });
    },
    [
      broadcastLeaderState,
      clearActiveIssue,
      clearActiveTimer,
      clearLocalLeadership,
      persistLeaseToken,
      refreshActiveTimer,
    ]
  );

  const sendHeartbeat = useCallback(async () => {
    if (!workspaceSlugValue || !activeTimer) return;

    const leaseToken = leaseTokenRef.current;
    if (!leaseToken) return;

    try {
      await worklogService.heartbeatTimer(workspaceSlugValue, {
        lease_token: leaseToken,
      });

      setError(null);
      leaderSeenAtRef.current = Date.now();
      broadcastLeaderState("leader-alive");
    } catch (heartbeatError) {
      handleHeartbeatFailure(heartbeatError);
    }
  }, [activeTimer, broadcastLeaderState, handleHeartbeatFailure, workspaceSlugValue]);

  const becomeLocalLeader = useCallback(() => {
    if (!activeTimer || !leaseTokenRef.current) return;
    if (isLocalLeaderRef.current) return;

    isLocalLeaderRef.current = true;
    leaderSeenAtRef.current = Date.now();
    broadcastLeaderState("leader-alive");

    if (leaderPingRef.current) {
      window.clearInterval(leaderPingRef.current);
    }
    leaderPingRef.current = window.setInterval(() => {
      leaderSeenAtRef.current = Date.now();
      broadcastLeaderState("leader-alive");
    }, LEADER_PING_INTERVAL_MS);

    stopLocalHeartbeat();
    heartbeatRef.current = window.setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    void sendHeartbeat();
  }, [activeTimer, broadcastLeaderState, sendHeartbeat, stopLocalHeartbeat]);

  const requestLocalLeadership = useCallback(() => {
    if (!activeTimer || !leaseTokenRef.current || isLocalLeaderRef.current) return;
    if (Date.now() - leaderSeenAtRef.current < LEADER_STALE_MS) return;
    if (claimTimeoutRef.current) return;

    claimTimeoutRef.current = window.setTimeout(() => {
      claimTimeoutRef.current = null;

      if (!activeTimer || !leaseTokenRef.current || isLocalLeaderRef.current) return;
      if (Date.now() - leaderSeenAtRef.current < LEADER_STALE_MS) return;

      becomeLocalLeader();
    }, LEADER_CLAIM_DELAY_MS);
  }, [activeTimer, becomeLocalLeader]);

  const syncLeaderFromBroadcast = useCallback(
    (event: MessageEvent<unknown>) => {
      const payload = event.data;
      if (typeof payload !== "object" || payload === null) return;

      const message = payload as { type?: string; tabId?: string };
      if (typeof message.type !== "string" || typeof message.tabId !== "string") return;

      if (message.type === "leader-alive") {
        leaderSeenAtRef.current = Date.now();
        if (message.tabId !== tabIdRef.current) {
          isLocalLeaderRef.current = false;
        }
      }

      if (message.type === "leader-release" && message.tabId !== tabIdRef.current) {
        leaderSeenAtRef.current = 0;
        requestLocalLeadership();
      }
    },
    [requestLocalLeadership]
  );

  const startHeartbeatCoordination = useCallback(() => {
    if (!activeTimer || !leaseTokenRef.current) {
      clearLocalLeadership();
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (!("BroadcastChannel" in window)) {
      becomeLocalLeader();
      return;
    }

    if (!broadcastRef.current) {
      broadcastRef.current = new BroadcastChannel(TIMER_BROADCAST_CHANNEL);
      broadcastRef.current.onmessage = syncLeaderFromBroadcast;
    }

    stopLeaderWatcher();
    leaderCheckRef.current = window.setInterval(() => {
      if (!activeTimer || !leaseTokenRef.current) return;

      if (!isLocalLeaderRef.current) {
        requestLocalLeadership();
        return;
      }

      if (Date.now() - leaderSeenAtRef.current >= LEADER_STALE_MS) {
        isLocalLeaderRef.current = false;
        requestLocalLeadership();
      }
    }, LEADER_CHECK_INTERVAL_MS);

    requestLocalLeadership();
  }, [activeTimer, clearLocalLeadership, requestLocalLeadership, stopLeaderWatcher, syncLeaderFromBroadcast]);

  useEffect(() => {
    setLastStoppedWorklog(null);
    setError(null);
    clearActiveTimer();
    clearActiveIssue();
    persistLeaseToken(readStoredLeaseToken());

    void refreshActiveTimer().catch(() => {
      // The provider keeps its own error state for rendering.
    });
  }, [clearActiveIssue, clearActiveTimer, persistLeaseToken, refreshActiveTimer]);

  useEffect(() => {
    if (!activeTimer) return undefined;

    const interval = setInterval(() => {
      setElapsedSeconds(getElapsedSecondsFromStartTime(activeTimer.start_time));
    }, 1000);

    setElapsedSeconds(getElapsedSecondsFromStartTime(activeTimer.start_time));

    return () => clearInterval(interval);
  }, [activeTimer]);

  useEffect(() => {
    void resolveActiveIssue();
  }, [resolveActiveIssue]);

  useEffect(() => {
    if (!activeTimer || !leaseTokenRef.current) {
      clearLocalLeadership();
      return;
    }

    startHeartbeatCoordination();

    return () => {
      broadcastLeaderState("leader-release");
      clearLocalLeadership();
    };
  }, [activeTimer, broadcastLeaderState, clearLocalLeadership, startHeartbeatCoordination]);

  useEffect(() => {
    return () => {
      clearLocalLeadership();
      if (broadcastRef.current) {
        broadcastRef.current.close();
        broadcastRef.current = null;
      }
    };
  }, [clearLocalLeadership]);

  const activeIssue = cachedActiveIssue;

  const startTimer = useCallback(
    async ({ issueId, projectId }: { issueId: string; projectId: string }): Promise<ITimerStartResponse> => {
      if (!workspaceSlugValue) throw new Error("Workspace slug is required to start a timer.");

      setIsMutating(true);
      try {
        const response = await worklogService.startTimer(workspaceSlugValue, {
          issue_id: issueId,
          project_id: projectId,
        });

        setError(null);
        setLastStoppedWorklog(response.stopped_worklog ?? null);
        persistLeaseToken(response.lease_token);
        applyActiveTimer(response.active_timer);
        clearActiveIssue();
        startHeartbeatCoordination();

        return response;
      } catch (startError) {
        setError(getErrorMessage(startError, "Failed to start timer."));
        throw startError;
      } finally {
        setIsMutating(false);
      }
    },
    [applyActiveTimer, clearActiveIssue, persistLeaseToken, startHeartbeatCoordination, workspaceSlugValue]
  );

  const stopTimer = useCallback(
    async ({ description = "" }: { description?: string } = {}): Promise<IWorklog> => {
      if (!workspaceSlugValue) throw new Error("Workspace slug is required to stop a timer.");

      setIsMutating(true);
      try {
        const worklog = await worklogService.stopTimer(workspaceSlugValue, {
          description,
        });
        showTimerToast(TOAST_TYPE.SUCCESS, "Timer stopped", "The timer was stopped successfully.");
        setError(null);
        setLastStoppedWorklog(worklog);
        persistLeaseToken(null);
        broadcastLeaderState("leader-release");
        clearLocalLeadership();
        clearActiveTimer();
        clearActiveIssue();

        return worklog;
      } catch (stopError) {
        setError(getErrorMessage(stopError, "Failed to stop timer."));
        showTimerToast(TOAST_TYPE.ERROR, "Timer not stopped", "The timer could not be stopped.");
        throw stopError;
      } finally {
        setIsMutating(false);
      }
    },
    [
      broadcastLeaderState,
      clearActiveTimer,
      clearActiveIssue,
      clearLocalLeadership,
      persistLeaseToken,
      workspaceSlugValue,
    ]
  );

  const discardTimer = useCallback(async (): Promise<void> => {
    if (!workspaceSlugValue) throw new Error("Workspace slug is required to discard a timer.");

    setIsMutating(true);
    try {
      await worklogService.discardTimer(workspaceSlugValue);
      showTimerToast(TOAST_TYPE.SUCCESS, "Timer discarded", "The timer was discarded successfully.");
      setError(null);
      setLastStoppedWorklog(null);
      persistLeaseToken(null);
      broadcastLeaderState("leader-release");
      clearLocalLeadership();
      clearActiveTimer();
      clearActiveIssue();
    } catch (discardError) {
      setError(getErrorMessage(discardError, "Failed to discard timer."));
      showTimerToast(TOAST_TYPE.ERROR, "Timer not discarded", "The timer could not be discarded.");
      throw discardError;
    } finally {
      setIsMutating(false);
    }
  }, [
    broadcastLeaderState,
    clearActiveTimer,
    clearActiveIssue,
    clearLocalLeadership,
    persistLeaseToken,
    workspaceSlugValue,
  ]);

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

"use client";

/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { createContext, useContext } from "react";
import type { IActiveTimer, ITimerStartResponse, IWorklog, TIssue } from "@plane/types";

export interface IGlobalWorklogTimerContext {
  activeTimer: IActiveTimer | null;
  activeIssue: TIssue | null;
  workItemLink: string | null;
  elapsedSeconds: number;
  isInitializing: boolean;
  isActiveIssueLoading: boolean;
  isMutating: boolean;
  error: string | null;
  lastStoppedWorklog: IWorklog | null;
  refreshActiveTimer: () => Promise<IActiveTimer | null>;
  startTimer: (args: { issueId: string; projectId: string }) => Promise<ITimerStartResponse>;
  stopTimer: (args?: { description?: string }) => Promise<IWorklog>;
  discardTimer: () => Promise<void>;
  isActiveForIssue: (issueId: string) => boolean;
}

export const GlobalWorklogTimerContext = createContext<IGlobalWorklogTimerContext | undefined>(undefined);

export const useGlobalWorklogTimer = (): IGlobalWorklogTimerContext => {
  const context = useContext(GlobalWorklogTimerContext);

  if (!context) {
    throw new Error("useGlobalWorklogTimer must be used within GlobalWorklogTimerProvider");
  }

  return context;
};

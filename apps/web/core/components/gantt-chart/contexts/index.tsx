/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { createContext, useContext } from "react";
import type { TTimelineType } from "@plane/types";
import { SIDEBAR_WIDTH } from "../constants";

export const TimeLineTypeContext = createContext<TTimelineType | undefined>(undefined);

export const useTimeLineType = () => {
  const timelineType = useContext(TimeLineTypeContext);
  return timelineType;
};

type TGanttSidebarWidthContextValue = {
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
};

const noopSetSidebarWidth = () => undefined;

export const GanttSidebarWidthContext = createContext<TGanttSidebarWidthContextValue | undefined>(undefined);

export const useGanttSidebarWidth = () => {
  const context = useContext(GanttSidebarWidthContext);

  return (
    context ?? {
      sidebarWidth: SIDEBAR_WIDTH,
      setSidebarWidth: noopSetSidebarWidth,
    }
  );
};

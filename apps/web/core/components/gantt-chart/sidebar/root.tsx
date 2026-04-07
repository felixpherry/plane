/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { useTranslation } from "@plane/i18n";
// components
import type { IBlockUpdateData } from "@plane/types";
import { Row, ERowVariant } from "@plane/ui";
import { cn } from "@plane/utils";
import { MultipleSelectGroupAction } from "@/components/core/multiple-select";
import { useGanttSidebarWidth } from "@/components/gantt-chart/contexts";
// helpers
// hooks
import type { TSelectionHelper } from "@/hooks/use-multiple-select";
// constants
import { GANTT_SELECT_GROUP, HEADER_HEIGHT, clampGanttSidebarWidth } from "../constants";

type Props = {
  blockIds: string[];
  blockUpdateHandler: (block: any, payload: IBlockUpdateData) => void;
  canLoadMoreBlocks?: boolean;
  loadMoreBlocks?: () => void;
  ganttContainerRef: RefObject<HTMLDivElement>;
  enableReorder: boolean | ((blockId: string) => boolean);
  enableSelection: boolean | ((blockId: string) => boolean);
  sidebarToRender: (props: any) => React.ReactNode;
  title: string;
  selectionHelpers: TSelectionHelper;
  showAllBlocks?: boolean;
  isEpic?: boolean;
};

export const GanttChartSidebar = observer(function GanttChartSidebar(props: Props) {
  const { t } = useTranslation();
  const [isResizing, setIsResizing] = useState(false);
  const initialWidthRef = useRef(0);
  const initialMouseXRef = useRef(0);
  const {
    blockIds,
    blockUpdateHandler,
    enableReorder,
    enableSelection,
    sidebarToRender,
    loadMoreBlocks,
    canLoadMoreBlocks,
    ganttContainerRef,
    title,
    selectionHelpers,
    showAllBlocks = false,
    isEpic = false,
  } = props;
  const { sidebarWidth, setSidebarWidth } = useGanttSidebarWidth();

  const isGroupSelectionEmpty = selectionHelpers.isGroupSelected(GANTT_SELECT_GROUP) === "empty";

  const handleResize = useCallback(
    (event: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = event.clientX - initialMouseXRef.current;
      const nextWidth = clampGanttSidebarWidth(initialWidthRef.current + deltaX);

      setSidebarWidth(nextWidth);
    },
    [isResizing, setSidebarWidth]
  );

  const startResizing = useCallback(
    (event: ReactMouseEvent) => {
      event.preventDefault();
      setIsResizing(true);
      initialWidthRef.current = sidebarWidth;
      initialMouseXRef.current = event.clientX;
    },
    [sidebarWidth]
  );

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (!isResizing) return undefined;

    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [handleResize, isResizing, stopResizing]);

  return (
    <Row
      // DO NOT REMOVE THE ID
      id="gantt-sidebar"
      className="relative sticky left-0 z-10 h-max min-h-full flex-shrink-0 border-r-[0.5px] border-subtle-1 bg-surface-1"
      style={{
        width: `${sidebarWidth}px`,
        minWidth: `${sidebarWidth}px`,
        maxWidth: `${sidebarWidth}px`,
      }}
      variant={ERowVariant.HUGGING}
    >
      <Row
        className="group/list-header sticky top-0 z-10 box-border flex flex-shrink-0 items-end justify-between gap-2 border-b-[0.5px] border-subtle-1 bg-surface-1 pr-4 pb-2 text-13 font-medium text-tertiary"
        style={{
          height: `${HEADER_HEIGHT}px`,
        }}
      >
        <div className={cn("flex items-center gap-2")}>
          {enableSelection && (
            <div className="absolute left-1 flex w-3.5 flex-shrink-0 items-center">
              <MultipleSelectGroupAction
                className={cn(
                  "pointer-events-none size-3.5 opacity-0 !outline-none group-hover/list-header:pointer-events-auto group-hover/list-header:opacity-100",
                  {
                    "pointer-events-auto opacity-100": !isGroupSelectionEmpty,
                  }
                )}
                groupID={GANTT_SELECT_GROUP}
                selectionHelpers={selectionHelpers}
              />
            </div>
          )}
          <h6>{title}</h6>
        </div>
        <h6>{t("common.duration")}</h6>
      </Row>
      <Row variant={ERowVariant.HUGGING} className="h-max min-h-full bg-surface-1">
        {sidebarToRender &&
          sidebarToRender({
            title,
            blockUpdateHandler,
            blockIds,
            enableReorder,
            enableSelection,
            canLoadMoreBlocks,
            ganttContainerRef,
            loadMoreBlocks,
            selectionHelpers,
            showAllBlocks,
            isEpic,
          })}
      </Row>
      <div
        className={cn(
          "absolute top-0 right-0 z-[20] h-full w-1 cursor-ew-resize transition-all duration-200",
          !isResizing && "hover:bg-surface-2",
          isResizing && "w-1.5 bg-layer-1"
        )}
        onMouseDown={startResizing}
        role="separator"
        aria-label="Resize gantt sidebar"
      />
    </Row>
  );
});

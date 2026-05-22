/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { MouseEvent } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { ChevronRightIcon } from "@plane/propel/icons";
import type { IGanttBlock, TIssue } from "@plane/types";
import { Row } from "@plane/ui";
import { cn } from "@plane/utils";
// components
import { MultipleSelectEntityAction } from "@/components/core/multiple-select";
import { IssueGanttSidebarBlock } from "@/components/issues/issue-layouts/gantt/blocks";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import type { TSelectionHelper } from "@/hooks/use-multiple-select";
import { useTimeLineChartStore } from "@/hooks/use-timeline-chart";
import useIssuePeekOverviewRedirection from "@/hooks/use-issue-peek-overview-redirection";
import { usePlatformOS } from "@/hooks/use-platform-os";
// local imports
import { BLOCK_HEIGHT, GANTT_SELECT_GROUP } from "../../constants";

type Props = {
  block: IGanttBlock;
  enableSelection: boolean;
  isDragging: boolean;
  selectionHelpers?: TSelectionHelper;
  isEpic?: boolean;
  nestingLevel?: number;
  isExpanded?: boolean;
  onToggleSubIssues?: (issueId: string, projectId: string, nestingLevel: number) => void;
};

export const IssuesSidebarBlock = observer(function IssuesSidebarBlock(props: Props) {
  const {
    block,
    enableSelection,
    isDragging,
    selectionHelpers,
    isEpic = false,
    nestingLevel = 0,
    isExpanded = false,
    onToggleSubIssues,
  } = props;
  // router
  const { workspaceSlug: routerWorkspaceSlug } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString();
  // store hooks
  const { updateActiveBlockId, isBlockActive, getNumberOfDaysFromPosition } = useTimeLineChartStore();
  const { getIsIssuePeeked } = useIssueDetail();
  const { isMobile } = usePlatformOS();
  const { handleRedirection } = useIssuePeekOverviewRedirection(isEpic);

  const isBlockComplete = !!block?.start_date && !!block?.target_date;
  const duration = isBlockComplete ? getNumberOfDaysFromPosition(block?.position?.width) : undefined;

  if (!block?.data) return null;

  const isIssueSelected = selectionHelpers?.getIsEntitySelected(block.id);
  const isIssueFocused = selectionHelpers?.getIsEntityActive(block.id);
  const isBlockHoveredOn = isBlockActive(block.id);
  const issueDetail = block.data as TIssue;
  const subIssuesCount = issueDetail.sub_issues_count ?? 0;
  const canToggleSubIssues = subIssuesCount > 0 && !isEpic;

  const handleToggleExpand = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();

    if (nestingLevel >= 3) {
      handleRedirection(workspaceSlug, issueDetail, isMobile, nestingLevel);
      return;
    }

    if (issueDetail.project_id) onToggleSubIssues?.(issueDetail.id, issueDetail.project_id, nestingLevel);
  };

  return (
    <div
      className={cn("group/list-block", {
        "rounded-sm bg-layer-1": isDragging,
        "rounded-l-sm border border-r-0 border-accent-strong": getIsIssuePeeked(block.data.id),
        "border border-r-0 border-strong-1": isIssueFocused,
      })}
      onMouseEnter={() => updateActiveBlockId(block.id)}
      onMouseLeave={() => updateActiveBlockId(null)}
    >
      <Row
        className={cn(
          "group flex w-full items-center gap-2 bg-layer-transparent pr-4 hover:bg-layer-transparent-hover",
          {
            "bg-layer-transparent-hover": isBlockHoveredOn,
            "bg-accent-primary/5 hover:bg-accent-primary/10": isIssueSelected,
            "bg-accent-primary/10": isIssueSelected && isBlockHoveredOn,
          }
        )}
        style={{
          height: `${BLOCK_HEIGHT}px`,
        }}
      >
        {enableSelection && selectionHelpers && (
          <div className="absolute left-1 flex items-center gap-2">
            <MultipleSelectEntityAction
              className={cn(
                "pointer-events-none opacity-0 transition-opacity group-hover/list-block:pointer-events-auto group-hover/list-block:opacity-100",
                {
                  "pointer-events-auto opacity-100": isIssueSelected,
                }
              )}
              groupId={GANTT_SELECT_GROUP}
              id={block.id}
              selectionHelpers={selectionHelpers}
            />
          </div>
        )}
        <div className="flex h-full flex-grow items-center justify-between gap-2 truncate">
          <div className="flex min-w-0 flex-grow items-center gap-0.5 truncate">
            {nestingLevel !== 0 && <div className="flex-shrink-0" style={{ width: `${nestingLevel * 12}px` }} />}
            <div className="grid size-4 flex-shrink-0 place-items-center">
              {canToggleSubIssues && (
                <button
                  type="button"
                  className="grid size-4 place-items-center rounded-xs text-placeholder hover:text-tertiary"
                  onClick={handleToggleExpand}
                >
                  <ChevronRightIcon
                    className={cn("size-4", {
                      "rotate-90": isExpanded,
                    })}
                    strokeWidth={2.5}
                  />
                </button>
              )}
            </div>
            <div className="min-w-0 flex-grow truncate">
              <IssueGanttSidebarBlock issueId={block.data.id} isEpic={isEpic} />
            </div>
          </div>
          {duration && (
            <div className="flex-shrink-0 text-13 text-secondary">
              <span>
                {duration} day{duration > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </Row>
    </div>
  );
});

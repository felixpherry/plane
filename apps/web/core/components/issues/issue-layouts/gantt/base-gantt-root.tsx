//  eslint-disable
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useCallback, useEffect, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { ALL_ISSUES, EIssueFilterType, EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { EIssuesStoreType, GroupByColumnTypes, IBlockUpdateData, TIssue, TIssueKanbanFilters } from "@plane/types";
import { EIssueLayoutTypes, GANTT_TIMELINE_TYPE } from "@plane/types";
import { renderFormattedPayloadDate } from "@plane/utils";
// components
import { TimeLineTypeContext } from "@/components/gantt-chart/contexts";
import { GanttChartRoot } from "@/components/gantt-chart/root";
import { IssueGanttSidebar } from "@/components/gantt-chart/sidebar/issues/sidebar";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useIssues } from "@/hooks/store/use-issues";
import { useUserPermissions } from "@/hooks/store/user";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
import { useIssuesActions } from "@/hooks/use-issues-actions";
import useLocalStorage from "@/hooks/use-local-storage";
import { useTimeLineChart } from "@/hooks/use-timeline-chart";
// plane web hooks
import { useBulkOperationStatus } from "@/plane-web/hooks/use-bulk-operation-status";
//
import {
  SIDEBAR_WIDTH,
  clampGanttSidebarWidth,
  getGanttSidebarWidthStorageKey,
} from "@/components/gantt-chart/constants";

import { IssueLayoutHOC } from "../issue-layout-HOC";
import { getGroupByColumns, isWorkspaceLevel } from "../utils";
import { GanttQuickAddIssueButton, QuickAddIssueRoot } from "../quick-add";
import { IssueGanttBlock } from "./blocks";
import { GroupedGantt } from "./assignee-grouped-gantt";

interface IBaseGanttRoot {
  viewId?: string | undefined;
  isCompletedCycle?: boolean;
  isEpic?: boolean;
}

export type GanttStoreType =
  | EIssuesStoreType.PROJECT
  | EIssuesStoreType.MODULE
  | EIssuesStoreType.CYCLE
  | EIssuesStoreType.PROJECT_VIEW
  | EIssuesStoreType.GLOBAL
  | EIssuesStoreType.EPIC;

type TGroupedTimelineGroupBy = Extract<GroupByColumnTypes, "state_detail.group" | "assignees" | "project">;

const GROUPED_TIMELINE_GROUP_BY_OPTIONS: TGroupedTimelineGroupBy[] = ["state_detail.group", "assignees", "project"];

const isGroupedTimelineGroupBy = (groupBy: unknown): groupBy is TGroupedTimelineGroupBy =>
  GROUPED_TIMELINE_GROUP_BY_OPTIONS.includes(groupBy as TGroupedTimelineGroupBy);

export const BaseGanttRoot = observer(function BaseGanttRoot(props: IBaseGanttRoot) {
  const { viewId, isCompletedCycle = false, isEpic = false } = props;
  const { t } = useTranslation();
  // router
  const { workspaceSlug, projectId } = useParams();
  const sidebarWidthStorageKey = projectId
    ? getGanttSidebarWidthStorageKey(projectId.toString())
    : "gantt-sidebar-width:default";

  const storeType = useIssueStoreType() as GanttStoreType;
  const { issues, issuesFilter } = useIssues(storeType);
  const {
    issue: { getIssueById },
    subIssues: subIssuesStore,
  } = useIssueDetail();
  const { fetchIssues, fetchNextIssues, updateIssue, quickAddIssue, updateFilters } = useIssuesActions(storeType);
  const { initGantt } = useTimeLineChart(GANTT_TIMELINE_TYPE.ISSUE);
  const { initGantt: initGroupedGantt } = useTimeLineChart(GANTT_TIMELINE_TYPE.GROUPED);
  // states
  const [expandedIssueIds, setExpandedIssueIds] = useState<Set<string>>(new Set());
  // store hooks
  const { allowPermissions } = useUserPermissions();

  const appliedDisplayFilters = issuesFilter.issueFilters?.displayFilters;
  const timelineGroupBy = appliedDisplayFilters?.group_by;
  const groupedTimelineGroupBy = isGroupedTimelineGroupBy(timelineGroupBy) ? timelineGroupBy : null;
  const isTimelineGrouped = !!groupedTimelineGroupBy && !isEpic;
  // plane web hooks
  const isBulkOperationsEnabled = useBulkOperationStatus();
  const { storedValue: storedSidebarWidth, setValue: setSidebarWidth } = useLocalStorage<number>(
    sidebarWidthStorageKey,
    SIDEBAR_WIDTH
  );
  const sidebarWidth = clampGanttSidebarWidth(storedSidebarWidth ?? SIDEBAR_WIDTH);
  // derived values
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 1);

  useEffect(() => {
    fetchIssues("init-loader", { canGroup: isTimelineGrouped, perPageCount: isTimelineGrouped ? 50 : 100 }, viewId);
  }, [fetchIssues, isTimelineGrouped, storeType, viewId]);

  useEffect(() => {
    if (isTimelineGrouped) initGroupedGantt();
    else initGantt();
  }, [initGantt, initGroupedGantt, isTimelineGrouped]);

  useEffect(() => {
    if (storedSidebarWidth == null) return;

    const normalizedSidebarWidth = clampGanttSidebarWidth(storedSidebarWidth);
    if (normalizedSidebarWidth !== storedSidebarWidth) {
      setSidebarWidth(normalizedSidebarWidth);
    }
  }, [setSidebarWidth, storedSidebarWidth]);

  const issuesIds = (issues.groupedIssueIds?.[ALL_ISSUES] as string[]) ?? [];
  const nextPageResults = issues.getPaginationData(undefined, undefined)?.nextPageResults;
  const groupedColumns = getGroupByColumns({
    groupBy: groupedTimelineGroupBy,
    includeNone: groupedTimelineGroupBy === "assignees",
    isWorkspaceLevel: isWorkspaceLevel(storeType),
  })?.filter((group) => {
    const groupIssueIds = issues.groupedIssueIds?.[group.id];
    return Array.isArray(groupIssueIds) && groupIssueIds.length > 0;
  });
  const collapsedGroupIds = new Set(issuesFilter?.issueFilters?.kanbanFilters?.group_by ?? []);

  const getDescendantIssueIds = useCallback(
    (issueId: string): string[] => {
      const childIds = subIssuesStore.subIssuesByIssueId(issueId) ?? [];
      return childIds.flatMap((childId) => [childId, ...getDescendantIssueIds(childId)]);
    },
    [subIssuesStore]
  );

  const handleToggleSubIssues = useCallback(
    (issueId: string, projectId: string, nestingLevel: number) => {
      if (!workspaceSlug || nestingLevel >= 3) return;

      if (expandedIssueIds.has(issueId)) {
        setExpandedIssueIds((currentExpandedIssueIds) => {
          const nextExpandedIssueIds = new Set(currentExpandedIssueIds);
          nextExpandedIssueIds.delete(issueId);
          getDescendantIssueIds(issueId).forEach((descendantId) => nextExpandedIssueIds.delete(descendantId));
          return nextExpandedIssueIds;
        });
        return;
      }

      setExpandedIssueIds((currentExpandedIssueIds) => new Set(currentExpandedIssueIds).add(issueId));
      if (!subIssuesStore.subIssuesByIssueId(issueId)) {
        subIssuesStore.fetchSubIssues(workspaceSlug.toString(), projectId, issueId);
      }
    },
    [expandedIssueIds, getDescendantIssueIds, subIssuesStore, workspaceSlug]
  );

  const nestedIssueIds = new Set<string>();
  if (!isEpic) {
    expandedIssueIds.forEach((issueId) => {
      getDescendantIssueIds(issueId).forEach((descendantId) => nestedIssueIds.add(descendantId));
    });
  }

  const nestingLevelByIssueId: Record<string, number> = {};
  const flattenIssueIds = (issueIds: string[], nestingLevel: number): string[] =>
    issueIds.flatMap((issueId) => {
      nestingLevelByIssueId[issueId] = nestingLevel;
      const issueDetail = getIssueById(issueId);
      const childIds =
        expandedIssueIds.has(issueId) && !isEpic ? subIssuesStore.subIssuesByIssueId(issueId) : undefined;

      if (!issueDetail || !childIds?.length || nestingLevel >= 3) return [issueId];

      return [issueId, ...flattenIssueIds(childIds, nestingLevel + 1)];
    });
  const visibleIssueIds = flattenIssueIds(
    issuesIds.filter((issueId) => !nestedIssueIds.has(issueId)),
    0
  );

  const { enableIssueCreation } = issues?.viewFlags || {};

  const loadMoreIssues = useCallback(() => {
    fetchNextIssues();
  }, [fetchNextIssues]);

  const handleCollapsedGroups = useCallback(
    (value: string) => {
      if (!workspaceSlug) return;

      let nextCollapsedGroups = issuesFilter?.issueFilters?.kanbanFilters?.group_by || [];
      if (nextCollapsedGroups.includes(value)) {
        nextCollapsedGroups = nextCollapsedGroups.filter((groupId) => groupId !== value);
      } else {
        nextCollapsedGroups = [...nextCollapsedGroups, value];
      }

      updateFilters(projectId?.toString() ?? "", EIssueFilterType.KANBAN_FILTERS, {
        group_by: nextCollapsedGroups,
      } as TIssueKanbanFilters);
    },
    [issuesFilter, projectId, updateFilters, workspaceSlug]
  );

  const updateIssueBlockStructure = async (issue: TIssue, data: IBlockUpdateData) => {
    if (!workspaceSlug || (isWorkspaceStore && !canEditIssue(issue.id))) return;

    const payload: any = { ...data };
    if (data.sort_order) payload.sort_order = data.sort_order.newSortOrder;

    updateIssue && (await updateIssue(issue.project_id, issue.id, payload));
  };

  const isWorkspaceStore = isWorkspaceLevel(storeType);
  const canEditIssue = useCallback(
    (issueId: string) => {
      const issue = getIssueById(issueId);
      if (!workspaceSlug || !issue?.project_id) return false;

      return allowPermissions(
        [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
        EUserPermissionsLevel.PROJECT,
        workspaceSlug.toString(),
        issue.project_id
      );
    },
    [allowPermissions, getIssueById, workspaceSlug]
  );
  const isAllowed = isWorkspaceStore
    ? visibleIssueIds.some((issueId) => canEditIssue(issueId))
    : allowPermissions([EUserPermissions.ADMIN, EUserPermissions.MEMBER], EUserPermissionsLevel.PROJECT);
  const updateBlockDates = useCallback(
    (
      updates: {
        id: string;
        start_date?: string;
        target_date?: string;
      }[]
    ) => {
      if (!workspaceSlug) return Promise.resolve();

      return issues.updateIssueDates(workspaceSlug.toString(), updates, projectId?.toString()).catch(() => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: t("toast.error"),
          message: "Error while updating work item dates, Please try again Later",
        });
      });
    },
    [issues, projectId, t, workspaceSlug]
  );

  const quickAdd =
    enableIssueCreation && isAllowed && !isCompletedCycle ? (
      <QuickAddIssueRoot
        layout={EIssueLayoutTypes.GANTT}
        QuickAddButton={GanttQuickAddIssueButton}
        containerClassName="sticky bottom-0 z-[1]"
        prePopulatedData={{
          start_date: renderFormattedPayloadDate(new Date()),
          target_date: renderFormattedPayloadDate(targetDate),
        }}
        quickAddCallback={quickAddIssue}
        isEpic={isEpic}
      />
    ) : undefined;

  return (
    <IssueLayoutHOC layout={EIssueLayoutTypes.GANTT}>
      <TimeLineTypeContext.Provider value={isTimelineGrouped ? GANTT_TIMELINE_TYPE.GROUPED : GANTT_TIMELINE_TYPE.ISSUE}>
        <div className="h-full w-full">
          {isTimelineGrouped && groupedColumns ? (
            <GroupedGantt
              storeType={storeType}
              groupedBy={groupedTimelineGroupBy}
              groupColumns={groupedColumns}
              collapsedGroupIds={collapsedGroupIds}
              onToggleGroup={handleCollapsedGroups}
              sidebarWidth={sidebarWidth}
              setSidebarWidth={setSidebarWidth}
            />
          ) : (
            <GanttChartRoot
              border={false}
              title={isEpic ? t("epic.label", { count: 2 }) : t("issue.label", { count: 2 })}
              loaderTitle={isEpic ? t("epic.label", { count: 2 }) : t("issue.label", { count: 2 })}
              blockIds={visibleIssueIds}
              blockUpdateHandler={updateIssueBlockStructure}
              blockToRender={(data: TIssue) => <IssueGanttBlock issueId={data.id} isEpic={isEpic} />}
              sidebarToRender={(props) => (
                <IssueGanttSidebar
                  {...props}
                  showAllBlocks
                  isEpic={isEpic}
                  nestingLevelByIssueId={nestingLevelByIssueId}
                  expandedIssueIds={expandedIssueIds}
                  onToggleSubIssues={handleToggleSubIssues}
                />
              )}
              enableBlockLeftResize={(issueId: string) => (isWorkspaceStore ? canEditIssue(issueId) : isAllowed)}
              enableBlockRightResize={(issueId: string) => (isWorkspaceStore ? canEditIssue(issueId) : isAllowed)}
              enableBlockMove={(issueId: string) => (isWorkspaceStore ? canEditIssue(issueId) : isAllowed)}
              enableReorder={
                expandedIssueIds.size === 0 && appliedDisplayFilters?.order_by === "sort_order" && isAllowed
              }
              enableAddBlock={isAllowed}
              enableSelection={isBulkOperationsEnabled && (isWorkspaceStore || isAllowed)}
              quickAdd={quickAdd}
              loadMoreBlocks={loadMoreIssues}
              canLoadMoreBlocks={nextPageResults}
              updateBlockDates={updateBlockDates}
              showAllBlocks
              enableDependency
              isEpic={isEpic}
              sidebarWidth={sidebarWidth}
              setSidebarWidth={setSidebarWidth}
            />
          )}
        </div>
      </TimeLineTypeContext.Provider>
    </IssueLayoutHOC>
  );
});

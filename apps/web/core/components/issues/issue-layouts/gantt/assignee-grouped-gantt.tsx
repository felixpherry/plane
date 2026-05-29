// eslint-disable
import type { ReactElement, RefObject } from "react";
import { useCallback, useEffect, useMemo } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { GANTT_TIMELINE_TYPE } from "@plane/types";
import type { IBlockUpdateData, IBlockUpdateDependencyData, TGroupedIssues } from "@plane/types";
import { CollapsibleButton, Row } from "@plane/ui";
import { cn } from "@plane/utils";
import RenderIfVisible from "@/components/core/render-if-visible-HOC";
import { BLOCK_HEIGHT } from "@/components/gantt-chart/constants";
import { GanttChartRoot } from "@/components/gantt-chart/root";
import { GanttDnDHOC } from "@/components/gantt-chart/sidebar/gantt-dnd-HOC";
import { IssueGanttBlock, IssueGanttSidebarBlock } from "@/components/issues/issue-layouts/gantt/blocks";
import { GanttLayoutListItemLoader } from "@/components/ui/loader/layouts/gantt-layout-loader";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useIssues } from "@/hooks/store/use-issues";
import { useUserPermissions } from "@/hooks/store/user";
import { useIssuesActions } from "@/hooks/use-issues-actions";
import { useTimeLineChart } from "@/hooks/use-timeline-chart";
import type { GanttStoreType } from "./base-gantt-root";
import {
  buildGroupedGanttRows,
  isGroupedGanttGroupRowData,
  isGroupedGanttIssueRowData,
} from "./grouped-rows";

type Props = {
  storeType: GanttStoreType;
  groupColumns: { id: string; name: string; icon?: ReactElement }[];
  collapsedGroupIds: Set<string>;
  onToggleGroup: (groupId: string) => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
};

type TGroupedTimeLineStore = ReturnType<typeof useTimeLineChart> & {
  setGroupedBlockDataMap: (data: Record<string, Record<string, unknown>>) => void;
};

const GroupedIssuesSidebar = observer(function GroupedIssuesSidebar(props: {
  blockIds: string[];
  ganttContainerRef: RefObject<HTMLDivElement>;
  collapsedGroupIds: Set<string>;
  onToggleGroup: (groupId: string) => void;
}) {
  const { blockIds, ganttContainerRef, collapsedGroupIds, onToggleGroup } = props;
  const { getBlockById, getNumberOfDaysFromPosition, updateActiveBlockId, isBlockActive } = useTimeLineChart(
    GANTT_TIMELINE_TYPE.GROUPED
  );

  return (
    <Row>
      {blockIds.map((blockId, index) => {
        const block = getBlockById(blockId);
        if (!block?.data) return null;

        return (
          <RenderIfVisible
            key={blockId}
            root={ganttContainerRef}
            horizontalOffset={100}
            verticalOffset={200}
            shouldRecordHeights={false}
            placeholderChildren={<GanttLayoutListItemLoader />}
          >
            <GanttDnDHOC id={blockId} isLastChild={index === blockIds.length - 1} isDragEnabled={false} onDrop={() => undefined}>
              {() => {
                if (isGroupedGanttGroupRowData(block.data)) {
                  const isOpen = !collapsedGroupIds.has(block.data.groupId);

                  return (
                    <button type="button" className="block w-full text-left" onClick={() => onToggleGroup(block.data.groupId)}>
                      <CollapsibleButton
                        isOpen={isOpen}
                        title={
                          <span className="flex items-center gap-2">
                            {block.data.icon ?? <span className="size-6" />}
                            <span>{block.data.name}</span>
                            <span className="text-13 text-tertiary">{block.data.count}</span>
                          </span>
                        }
                        className="h-10 bg-layer-1 px-3 py-0 hover:bg-layer-1-hover"
                        titleClassName="text-13"
                      />
                    </button>
                  );
                }

                if (!isGroupedGanttIssueRowData(block.data)) return null;

                const duration =
                  block.start_date && block.target_date ? getNumberOfDaysFromPosition(block.position?.width) : undefined;
                const isHovered = isBlockActive(block.id);

                return (
                  <div onMouseEnter={() => updateActiveBlockId(block.id)} onMouseLeave={() => updateActiveBlockId(null)}>
                    <Row
                      className={cn("group flex w-full items-center gap-2 bg-layer-transparent pr-4 hover:bg-layer-transparent-hover", {
                        "bg-layer-transparent-hover": isHovered,
                      })}
                      style={{ height: `${BLOCK_HEIGHT}px` }}
                    >
                      <div className="flex min-w-0 flex-grow items-center justify-between gap-2 truncate pl-4">
                        <div className="min-w-0 flex-grow truncate">
                          <IssueGanttSidebarBlock issueId={block.data.issueId} rowId={block.data.rowId} />
                        </div>
                        {duration ? <span className="flex-shrink-0 text-13 text-secondary">{duration} days</span> : null}
                      </div>
                    </Row>
                  </div>
                );
              }}
            </GanttDnDHOC>
          </RenderIfVisible>
        );
      })}
    </Row>
  );
});

export const AssigneeGroupedGantt = observer(function AssigneeGroupedGantt(props: Props) {
  const { storeType, groupColumns, collapsedGroupIds, onToggleGroup, sidebarWidth, setSidebarWidth } = props;
  const { t } = useTranslation();
  const { workspaceSlug, projectId } = useParams();
  const { issues } = useIssues(storeType);
  const {
    issue: { getIssueById },
  } = useIssueDetail();
  const { updateIssue } = useIssuesActions(storeType);
  const { allowPermissions } = useUserPermissions();
  const timelineStore = useTimeLineChart(GANTT_TIMELINE_TYPE.GROUPED) as TGroupedTimeLineStore;

  const groupedIssueIds = (issues.groupedIssueIds ?? {}) as TGroupedIssues;
  const rows = useMemo(
    () =>
      buildGroupedGanttRows({
        groupedIssueIds,
        groups: groupColumns,
        collapsedGroupIds,
        getIssueById,
      }),
    [collapsedGroupIds, getIssueById, groupColumns, groupedIssueIds]
  );
  const blockIds = useMemo(() => rows.map((row) => row.rowId), [rows]);
  const rowDataMap = useMemo(() => Object.fromEntries(rows.map((row) => [row.rowId, row])), [rows]);

  useEffect(() => {
    timelineStore.setGroupedBlockDataMap(rowDataMap as Record<string, Record<string, unknown>>);
  }, [rowDataMap, timelineStore]);

  const isAllowed = allowPermissions([EUserPermissions.ADMIN, EUserPermissions.MEMBER], EUserPermissionsLevel.PROJECT);

  const updateIssueBlockStructure = async (row: (typeof rows)[number], data: IBlockUpdateData) => {
    if (row.rowType !== "issue") return;

    const issue = getIssueById(row.issueId);
    if (!issue || !updateIssue) return;

    const payload = { ...data } as Partial<typeof issue> & { sort_order?: number };
    if (data.sort_order) payload.sort_order = data.sort_order.newSortOrder;

    await updateIssue(issue.project_id, issue.id, payload);
  };

  const updateBlockDates = useCallback(
    (updates: IBlockUpdateDependencyData[]) => {
      if (!workspaceSlug || !projectId) return Promise.resolve();

      const issueUpdates = updates
        .map((update) => {
          const row = rowDataMap[update.id];
          if (!row || row.rowType !== "issue") return undefined;

          return {
            ...update,
            id: row.issueId,
          };
        })
        .filter((update): update is IBlockUpdateDependencyData => !!update);

      if (issueUpdates.length === 0) return Promise.resolve();

      return issues.updateIssueDates(workspaceSlug.toString(), issueUpdates, projectId.toString()).catch(() => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: t("toast.error"),
          message: "Error while updating work item dates, Please try again Later",
        });
      });
    },
    [issues, projectId, rowDataMap, t, workspaceSlug]
  );

  return (
    <GanttChartRoot
      border={false}
      title={t("issue.label", { count: 2 })}
      loaderTitle={t("issue.label", { count: 2 })}
      blockIds={blockIds}
      blockUpdateHandler={updateIssueBlockStructure}
      blockToRender={(data: (typeof rows)[number]) =>
        isGroupedGanttIssueRowData(data) ? <IssueGanttBlock issueId={data.issueId} rowId={data.rowId} /> : null
      }
      sidebarToRender={(sidebarProps: { blockIds: string[]; ganttContainerRef: RefObject<HTMLDivElement> }) => (
        <GroupedIssuesSidebar
          {...sidebarProps}
          collapsedGroupIds={collapsedGroupIds}
          onToggleGroup={onToggleGroup}
        />
      )}
      enableBlockLeftResize={(blockId: string) => isAllowed && rowDataMap[blockId]?.rowType === "issue"}
      enableBlockRightResize={(blockId: string) => isAllowed && rowDataMap[blockId]?.rowType === "issue"}
      enableBlockMove={(blockId: string) => isAllowed && rowDataMap[blockId]?.rowType === "issue"}
      enableReorder={false}
      enableAddBlock={false}
      enableSelection={false}
      canLoadMoreBlocks={false}
      updateBlockDates={updateBlockDates}
      showAllBlocks
      enableDependency={(blockId: string) => rowDataMap[blockId]?.rowType === "issue"}
      sidebarWidth={sidebarWidth}
      setSidebarWidth={setSidebarWidth}
    />
  );
});

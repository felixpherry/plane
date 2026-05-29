/* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */
/**
 * PROTOTYPE — throwaway.
 * Question: can existing Gantt components render issue rows grouped by assignee?
 * Delete or absorb after decision.
 */

import { useEffect, useMemo, useState } from "react";
import { runInAction } from "mobx";
import { observer } from "mobx-react";

import type { RefObject } from "react";
import type { IBlockUpdateData, IBlockUpdateDependencyData, IGanttBlock } from "@plane/types";
import { GANTT_TIMELINE_TYPE } from "@plane/types";
import { Row, ERowVariant, CollapsibleButton } from "@plane/ui";
import { cn } from "@plane/utils";

import { MultipleSelectEntityAction } from "@/components/core/multiple-select";
import RenderIfVisible from "@/components/core/render-if-visible-HOC";
import { GanttChartRoot } from "@/components/gantt-chart";
import { BLOCK_HEIGHT, GANTT_SELECT_GROUP, SIDEBAR_WIDTH } from "@/components/gantt-chart/constants";
import { TimeLineTypeContext } from "@/components/gantt-chart/contexts";
import { GanttDnDHOC } from "@/components/gantt-chart/sidebar/gantt-dnd-HOC";
import { getItemPositionWidth } from "@/components/gantt-chart/views/helpers";
import { GanttLayoutListItemLoader } from "@/components/ui/loader/layouts/gantt-layout-loader";
import { useTimeLineChart, useTimeLineChartStore } from "@/hooks/use-timeline-chart";
import type { TSelectionHelper } from "@/hooks/use-multiple-select";

type TAssignee = {
  id: string;
  name: string;
  initials: string;
  colorClassName: string;
};

type TPrototypeIssue = {
  id: string;
  key: string;
  title: string;
  assigneeIds: string[];
  start_date: string;
  target_date: string;
  state: "Backlog" | "Todo" | "Doing" | "Done";
};

type TPrototypeBlockData = {
  id: string;
  name: string;
  sort_order: number | null;
  start_date?: string | null;
  target_date?: string | null;
  project_id: string;
  prototypeKind: "group" | "issue";
  rowId: string;
  groupId: string;
  issueId?: string;
  issueKey?: string;
  assigneeName?: string;
  state?: TPrototypeIssue["state"];
};

type TPrototypeGroup = {
  id: string;
  title: string;
  assignee?: TAssignee;
  issueIds: string[];
};

type TPrototypeSidebarProps = {
  blockIds: string[];
  ganttContainerRef: RefObject<HTMLDivElement>;
  enableSelection: boolean;
  selectionHelpers?: TSelectionHelper;
  collapsedGroupIds: Set<string>;
  onToggleGroup: (groupId: string) => void;
};

type TMutableTimelineStore = ReturnType<typeof useTimeLineChartStore> & {
  blocksMap: Record<string, IGanttBlock>;
};

const ASSIGNEES: TAssignee[] = [
  { id: "ada", name: "Ada Lovelace", initials: "AL", colorClassName: "bg-pink-500" },
  { id: "grace", name: "Grace Hopper", initials: "GH", colorClassName: "bg-indigo-500" },
  { id: "katherine", name: "Katherine Johnson", initials: "KJ", colorClassName: "bg-emerald-500" },
];

const ISSUES: TPrototypeIssue[] = [
  {
    id: "i-1",
    key: "PAY-101",
    title: "Payroll calendar import",
    assigneeIds: ["ada"],
    start_date: "2026-05-18",
    target_date: "2026-05-29",
    state: "Doing",
  },
  {
    id: "i-2",
    key: "PAY-102",
    title: "Retroactive allowance rules",
    assigneeIds: ["ada", "grace"],
    start_date: "2026-05-25",
    target_date: "2026-06-12",
    state: "Todo",
  },
  {
    id: "i-3",
    key: "HR-44",
    title: "Contract renewal reminders",
    assigneeIds: ["grace"],
    start_date: "2026-06-03",
    target_date: "2026-06-19",
    state: "Doing",
  },
  {
    id: "i-4",
    key: "PAY-118",
    title: "Payslip PDF review",
    assigneeIds: ["katherine", "ada"],
    start_date: "2026-06-15",
    target_date: "2026-07-01",
    state: "Backlog",
  },
  {
    id: "i-5",
    key: "HR-61",
    title: "Missing tax ID report",
    assigneeIds: [],
    start_date: "2026-05-21",
    target_date: "2026-06-05",
    state: "Todo",
  },
  {
    id: "i-6",
    key: "OPS-9",
    title: "Month-end freeze checklist",
    assigneeIds: ["katherine"],
    start_date: "2026-06-25",
    target_date: "2026-07-10",
    state: "Done",
  },
];

const ISSUE_BY_ID = Object.fromEntries(ISSUES.map((issue) => [issue.id, issue]));
const ASSIGNEE_BY_ID = Object.fromEntries(ASSIGNEES.map((assignee) => [assignee.id, assignee]));

const isPrototypeBlockData = (data: unknown): data is TPrototypeBlockData =>
  typeof data === "object" && data !== null && "prototypeKind" in data && "rowId" in data;

const getGroupRowId = (groupId: string) => `group_${groupId}`;
const getIssueRowId = (issueId: string, groupId: string) => `issue_${issueId}_${groupId}`;

const buildGroups = (): TPrototypeGroup[] => {
  const groups = ASSIGNEES.map((assignee) => ({
    id: assignee.id,
    title: assignee.name,
    assignee,
    issueIds: ISSUES.filter((issue) => issue.assigneeIds.includes(assignee.id)).map((issue) => issue.id),
  })).filter((group) => group.issueIds.length > 0);

  return [
    ...groups,
    {
      id: "none",
      title: "Unassigned",
      issueIds: ISSUES.filter((issue) => issue.assigneeIds.length === 0).map((issue) => issue.id),
    },
  ];
};

const buildBlockData = (groups: TPrototypeGroup[], collapsedGroupIds: Set<string>) => {
  const rows: TPrototypeBlockData[] = [];

  groups.forEach((group, groupIndex) => {
    rows.push({
      id: getGroupRowId(group.id),
      name: group.title,
      sort_order: groupIndex,
      project_id: "prototype-project",
      prototypeKind: "group",
      rowId: getGroupRowId(group.id),
      groupId: group.id,
      assigneeName: group.title,
    });

    if (collapsedGroupIds.has(group.id)) return;

    group.issueIds.forEach((issueId, issueIndex) => {
      const issue = ISSUE_BY_ID[issueId];
      rows.push({
        id: issue.id,
        name: issue.title,
        sort_order: issueIndex,
        start_date: issue.start_date,
        target_date: issue.target_date,
        project_id: "prototype-project",
        prototypeKind: "issue",
        rowId: getIssueRowId(issue.id, group.id),
        groupId: group.id,
        issueId: issue.id,
        issueKey: issue.key,
        assigneeName: ASSIGNEE_BY_ID[group.id]?.name ?? "Unassigned",
        state: issue.state,
      });
    });
  });

  return rows;
};

const Avatar = ({ assignee }: { assignee?: TAssignee }) => (
  <div
    className={cn(
      "grid size-6 flex-shrink-0 place-items-center rounded-full text-10 font-semibold text-white",
      assignee?.colorClassName ?? "bg-custom-background-80 text-custom-text-300"
    )}
  >
    {assignee?.initials ?? "—"}
  </div>
);

const IssueBar = ({ data }: { data: TPrototypeBlockData }) => (
  <div className="text-xs shadow-sm flex h-7 w-full items-center gap-2 rounded-sm bg-accent-primary px-2 font-medium text-white">
    <span>{data.issueKey}</span>
    <span className="font-normal truncate opacity-90">{data.name}</span>
  </div>
);

const PrototypeSidebarRow = observer(function PrototypeSidebarRow(props: {
  block: IGanttBlock;
  enableSelection: boolean;
  selectionHelpers?: TSelectionHelper;
  collapsedGroupIds: Set<string>;
  onToggleGroup: (groupId: string) => void;
}) {
  const { block, enableSelection, selectionHelpers, collapsedGroupIds, onToggleGroup } = props;
  const { updateActiveBlockId, isBlockActive, getNumberOfDaysFromPosition } = useTimeLineChartStore();
  const data = block.data;

  if (!isPrototypeBlockData(data)) return null;

  if (data.prototypeKind === "group") {
    const assignee = data.groupId === "none" ? undefined : ASSIGNEE_BY_ID[data.groupId];
    const isOpen = !collapsedGroupIds.has(data.groupId);

    return (
      <button className="block w-full text-left" type="button" onClick={() => onToggleGroup(data.groupId)}>
        <CollapsibleButton
          isOpen={isOpen}
          title={
            <span className="flex items-center gap-2">
              <Avatar assignee={assignee} />
              <span>{data.assigneeName}</span>
            </span>
          }
          indicatorElement={
            <span className="bg-custom-background-80 text-custom-text-300 rounded px-1.5 py-0.5 text-10">group</span>
          }
          className="h-10 border-b border-subtle-1 bg-layer-1 px-3 py-0 hover:bg-layer-1-hover"
          titleClassName="text-13"
        />
      </button>
    );
  }

  const isSelected = selectionHelpers?.getIsEntitySelected(block.id);
  const isFocused = selectionHelpers?.getIsEntityActive(block.id);
  const isHovered = isBlockActive(block.id);
  const duration =
    block.start_date && block.target_date ? getNumberOfDaysFromPosition(block.position?.width) : undefined;

  return (
    <div
      className={cn("group/list-block", {
        "border border-r-0 border-strong-1": isFocused,
      })}
      onMouseEnter={() => updateActiveBlockId(block.id)}
      onMouseLeave={() => updateActiveBlockId(null)}
    >
      <Row
        className={cn(
          "group flex w-full items-center gap-2 bg-layer-transparent pr-4 hover:bg-layer-transparent-hover",
          {
            "bg-layer-transparent-hover": isHovered,
            "bg-accent-primary/5 hover:bg-accent-primary/10": isSelected,
          }
        )}
        style={{ height: `${BLOCK_HEIGHT}px` }}
      >
        {enableSelection && selectionHelpers && (
          <div className="absolute left-1 flex items-center gap-2">
            <MultipleSelectEntityAction
              className={cn(
                "pointer-events-none opacity-0 transition-opacity group-hover/list-block:pointer-events-auto group-hover/list-block:opacity-100",
                { "pointer-events-auto opacity-100": isSelected }
              )}
              groupId={GANTT_SELECT_GROUP}
              id={block.id}
              selectionHelpers={selectionHelpers}
            />
          </div>
        )}
        <div className="flex min-w-0 flex-grow items-center justify-between gap-2 truncate pl-4">
          <div className="flex min-w-0 items-center gap-2 truncate">
            <span className="w-16 flex-shrink-0 text-12 font-semibold text-secondary">{data.issueKey}</span>
            <span className="truncate text-13 text-primary">{data.name}</span>
          </div>
          {duration && <span className="flex-shrink-0 text-13 text-secondary">{duration}d</span>}
        </div>
      </Row>
    </div>
  );
});

const PrototypeGroupedSidebar = observer(function PrototypeGroupedSidebar(props: TPrototypeSidebarProps) {
  const { blockIds, ganttContainerRef, enableSelection, selectionHelpers, collapsedGroupIds, onToggleGroup } = props;
  const { getBlockById } = useTimeLineChart(GANTT_TIMELINE_TYPE.ISSUE);

  return (
    <Row variant={ERowVariant.HUGGING} className="h-full">
      {blockIds.map((blockId, index) => {
        const block = getBlockById(blockId);
        if (!block) return null;

        return (
          <RenderIfVisible
            key={blockId}
            root={ganttContainerRef}
            horizontalOffset={100}
            verticalOffset={200}
            shouldRecordHeights={false}
            placeholderChildren={<GanttLayoutListItemLoader />}
          >
            <GanttDnDHOC
              id={blockId}
              isLastChild={index === blockIds.length - 1}
              isDragEnabled={false}
              onDrop={() => undefined}
            >
              {() => (
                <PrototypeSidebarRow
                  block={block}
                  enableSelection={enableSelection}
                  selectionHelpers={selectionHelpers}
                  collapsedGroupIds={collapsedGroupIds}
                  onToggleGroup={onToggleGroup}
                />
              )}
            </GanttDnDHOC>
          </RenderIfVisible>
        );
      })}
    </Row>
  );
});

const PrototypeGanttContent = observer(function PrototypeGanttContent() {
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set(["grace"]));
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_WIDTH);
  const timelineStore = useTimeLineChartStore() as TMutableTimelineStore;

  const groups = useMemo(() => buildGroups(), []);
  const blockData = useMemo(() => buildBlockData(groups, collapsedGroupIds), [groups, collapsedGroupIds]);
  const blockIds = useMemo(() => blockData.map((data) => data.rowId), [blockData]);
  const blockDataByRowId = useMemo(() => Object.fromEntries(blockData.map((data) => [data.rowId, data])), [blockData]);

  useEffect(() => {
    runInAction(() => {
      timelineStore.blocksMap = Object.fromEntries(
        blockIds.map((blockId) => {
          const data = blockDataByRowId[blockId];
          const block: IGanttBlock = {
            id: data.rowId,
            name: data.name,
            data,
            sort_order: data.sort_order ?? undefined,
            start_date: data.start_date ?? undefined,
            target_date: data.target_date ?? undefined,
            meta: {
              project_id: data.project_id,
            },
          };

          if (timelineStore.currentViewData) {
            block.position = getItemPositionWidth(timelineStore.currentViewData, block);
          }

          return [blockId, block];
        })
      );
    });
  }, [blockDataByRowId, blockIds, timelineStore, timelineStore.currentViewData]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const duplicateRows = blockData.filter((data) => data.prototypeKind === "issue" && data.issueId === "i-2").length;

  return (
    <div className="flex h-full min-h-screen flex-col bg-surface-1 p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs mb-1 font-semibold tracking-wide text-red-500 uppercase">PROTOTYPE — throwaway</div>
          <h1 className="text-2xl font-semibold text-primary">Gantt group by assignees</h1>
          <p className="text-sm mt-1 text-secondary">
            Uses existing <code>GanttChartRoot</code>, sidebar, row list, blocks list, DnD wrapper, render-if-visible,
            and timeline store shape.
          </p>
        </div>
        <div className="text-xs rounded border border-subtle px-3 py-2 text-secondary">
          PAY-102 rendered {duplicateRows} times while issue data stays one logical issue.
        </div>
      </div>

      <div className="min-h-[720px] flex-1">
        <GanttChartRoot
          title="Work items"
          loaderTitle="Work items"
          blockIds={blockIds}
          sidebarToRender={(props: unknown) => (
            <PrototypeGroupedSidebar
              {...(props as TPrototypeSidebarProps)}
              collapsedGroupIds={collapsedGroupIds}
              onToggleGroup={toggleGroup}
            />
          )}
          blockToRender={(data: unknown) => (isPrototypeBlockData(data) ? <IssueBar data={data} /> : null)}
          blockUpdateHandler={async (_block: unknown, _payload: IBlockUpdateData) => undefined}
          updateBlockDates={async (_updates: IBlockUpdateDependencyData[]) => undefined}
          enableBlockLeftResize={false}
          enableBlockRightResize={false}
          enableBlockMove={false}
          enableReorder={false}
          enableAddBlock={false}
          enableSelection={false}
          enableDependency={false}
          showAllBlocks
          sidebarWidth={sidebarWidth}
          setSidebarWidth={setSidebarWidth}
        />
      </div>
    </div>
  );
});

export const AssigneeGroupingPrototype = observer(function AssigneeGroupingPrototype() {
  return (
    <TimeLineTypeContext.Provider value={GANTT_TIMELINE_TYPE.ISSUE}>
      <PrototypeGanttContent />
    </TimeLineTypeContext.Provider>
  );
});

import type { ReactElement } from "react";
import type { IGroupByColumn, TGroupedIssues, TIssue } from "@plane/types";

const GROUP_ROW_PREFIX = "group";
const ISSUE_ROW_PREFIX = "issue";

export type TGroupedGanttRowData = IGroupedGanttGroupRowData | IGroupedGanttIssueRowData | IGroupedGanttLoadMoreRowData;

export interface IGroupedGanttGroupRowData {
  id: string;
  rowId: string;
  rowType: "group";
  groupId: string;
  name: string;
  count: number;
  icon?: ReactElement;
  sort_order: number | null;
  project_id?: string | null;
}

export interface IGroupedGanttIssueRowData {
  id: string;
  rowId: string;
  rowType: "issue";
  issueId: string;
  groupId: string;
  name: string;
  sort_order: number | null;
  start_date?: string | null;
  target_date?: string | null;
  project_id?: string | null;
}

export interface IGroupedGanttLoadMoreRowData {
  id: string;
  rowId: string;
  rowType: "load-more";
  groupId: string;
  sort_order: number | null;
  project_id?: string | null;
}

export interface IBuildGroupedGanttRows {
  groupedIssueIds: TGroupedIssues;
  groups: IGroupByColumn[];
  collapsedGroupIds: Set<string>;
  canLoadMoreGroupIds?: Set<string>;
  loadingGroupIds?: Set<string>;
  getIssueById: (issueId: string) => TIssue | undefined;
}

export const getGroupedGanttGroupRowId = (groupId: string) => `${GROUP_ROW_PREFIX}_${groupId}`;

export const getGroupedGanttIssueRowId = (issueId: string, groupId: string) =>
  `${ISSUE_ROW_PREFIX}_${issueId}_${groupId}`;

export const getGroupedGanttLoadMoreRowId = (groupId: string) => `load-more_${groupId}`;

export const isGroupedGanttGroupRowData = (data: unknown): data is IGroupedGanttGroupRowData =>
  typeof data === "object" && data !== null && "rowType" in data && data.rowType === "group";

export const isGroupedGanttIssueRowData = (data: unknown): data is IGroupedGanttIssueRowData =>
  typeof data === "object" && data !== null && "rowType" in data && data.rowType === "issue";

export const isGroupedGanttLoadMoreRowData = (data: unknown): data is IGroupedGanttLoadMoreRowData =>
  typeof data === "object" && data !== null && "rowType" in data && data.rowType === "load-more";

export const getGroupedGanttSelectionIssueIds = (rows: TGroupedGanttRowData[]): string[] => {
  const issueIds = new Set<string>();

  rows.forEach((row) => {
    if (row.rowType === "issue") issueIds.add(row.issueId);
  });

  return [...issueIds];
};

export const buildGroupedGanttRows = ({
  groupedIssueIds,
  groups,
  collapsedGroupIds,
  canLoadMoreGroupIds = new Set(),
  loadingGroupIds = new Set(),
  getIssueById,
}: IBuildGroupedGanttRows): TGroupedGanttRowData[] => {
  const rows: TGroupedGanttRowData[] = [];

  groups.forEach((group, groupIndex) => {
    const groupIssueIds = groupedIssueIds[group.id] ?? [];
    if (!Array.isArray(groupIssueIds) || groupIssueIds.length === 0) return;

    rows.push({
      id: getGroupedGanttGroupRowId(group.id),
      rowId: getGroupedGanttGroupRowId(group.id),
      rowType: "group",
      groupId: group.id,
      name: group.name,
      count: groupIssueIds.length,
      icon: group.icon,
      sort_order: groupIndex,
      project_id: undefined,
    });

    if (collapsedGroupIds.has(group.id)) return;

    groupIssueIds.forEach((issueId, issueIndex) => {
      const issue = getIssueById(issueId);
      if (!issue) return;

      rows.push({
        id: getGroupedGanttIssueRowId(issue.id, group.id),
        rowId: getGroupedGanttIssueRowId(issue.id, group.id),
        rowType: "issue",
        issueId: issue.id,
        groupId: group.id,
        name: issue.name,
        sort_order: issue.sort_order ?? issueIndex,
        start_date: issue.start_date,
        target_date: issue.target_date,
        project_id: issue.project_id,
      });
    });

    if (canLoadMoreGroupIds.has(group.id) || loadingGroupIds.has(group.id)) {
      rows.push({
        id: getGroupedGanttLoadMoreRowId(group.id),
        rowId: getGroupedGanttLoadMoreRowId(group.id),
        rowType: "load-more",
        groupId: group.id,
        sort_order: groupIssueIds.length,
        project_id: undefined,
      });
    }
  });

  return rows;
};

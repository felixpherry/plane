import type { IIssueDisplayFilterOptions, TIssueGroupByOptions } from "@plane/types";

const WORKSPACE_SPREADSHEET_LAYOUT = "spreadsheet";
const WORKSPACE_KANBAN_LAYOUT = "kanban";
const WORKSPACE_TIMELINE_LAYOUT = "gantt_chart";

const WORKSPACE_LAYOUTS = [WORKSPACE_SPREADSHEET_LAYOUT, WORKSPACE_KANBAN_LAYOUT, WORKSPACE_TIMELINE_LAYOUT] as const;

const WORKSPACE_LAYOUT_GROUP_BY_OPTIONS: Record<string, TIssueGroupByOptions[]> = {
  [WORKSPACE_KANBAN_LAYOUT]: ["state_detail.group", "assignees", "project"],
  [WORKSPACE_TIMELINE_LAYOUT]: ["state_detail.group", "assignees", "project"],
};

const WORKSPACE_LAYOUT_GROUP_BY_FALLBACKS: Record<string, TIssueGroupByOptions> = {
  [WORKSPACE_KANBAN_LAYOUT]: "state_detail.group",
  [WORKSPACE_TIMELINE_LAYOUT]: "assignees",
};

const getComputedDisplayFilters = (
  displayFilters: IIssueDisplayFilterOptions = {},
  defaultValues?: IIssueDisplayFilterOptions
): IIssueDisplayFilterOptions => {
  const filters = displayFilters && Object.keys(displayFilters).length > 0 ? displayFilters : defaultValues;

  return {
    calendar: {
      show_weekends: filters?.calendar?.show_weekends || false,
      layout: filters?.calendar?.layout || "month",
    },
    layout: filters?.layout || WORKSPACE_SPREADSHEET_LAYOUT,
    order_by: filters?.order_by || "sort_order",
    group_by: filters?.group_by || null,
    sub_group_by: filters?.sub_group_by || null,
    sub_issue: filters?.sub_issue || false,
    show_empty_groups: filters?.show_empty_groups || false,
  };
};

const isWorkspaceLayout = (layout: unknown): layout is (typeof WORKSPACE_LAYOUTS)[number] =>
  WORKSPACE_LAYOUTS.includes(layout as (typeof WORKSPACE_LAYOUTS)[number]);

const getNormalizedWorkspaceLayout = (layout: unknown) =>
  isWorkspaceLayout(layout) ? layout : WORKSPACE_SPREADSHEET_LAYOUT;

const getNormalizedWorkspaceGroupBy = (
  layout: IIssueDisplayFilterOptions["layout"],
  groupBy: TIssueGroupByOptions | undefined
): TIssueGroupByOptions | undefined => {
  const allowedGroupByOptions = WORKSPACE_LAYOUT_GROUP_BY_OPTIONS[layout as string];

  if (!allowedGroupByOptions) return groupBy;
  if (groupBy && allowedGroupByOptions.includes(groupBy)) return groupBy;

  return WORKSPACE_LAYOUT_GROUP_BY_FALLBACKS[layout as string];
};

export const normalizeWorkspaceDisplayFilters = (
  displayFilters: IIssueDisplayFilterOptions | undefined,
  defaultValues?: IIssueDisplayFilterOptions
): IIssueDisplayFilterOptions => {
  const normalizedDisplayFilters = getComputedDisplayFilters(displayFilters, defaultValues);

  normalizedDisplayFilters.layout = getNormalizedWorkspaceLayout(normalizedDisplayFilters.layout);

  if (
    normalizedDisplayFilters.layout === WORKSPACE_KANBAN_LAYOUT ||
    normalizedDisplayFilters.layout === WORKSPACE_TIMELINE_LAYOUT
  ) {
    normalizedDisplayFilters.sub_group_by = null;
  }

  normalizedDisplayFilters.group_by = getNormalizedWorkspaceGroupBy(
    normalizedDisplayFilters.layout,
    normalizedDisplayFilters.group_by
  );

  return normalizedDisplayFilters;
};

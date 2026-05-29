import test from "node:test";
import assert from "node:assert/strict";
import type { IGroupByColumn, TIssue } from "@plane/types";
import { buildGroupedGanttRows, getGroupedGanttSelectionIssueIds } from "./grouped-rows";

const issue = (id: string): TIssue =>
  ({
    id,
    name: id,
    project_id: "project-1",
    sort_order: 1,
    start_date: "2026-05-01",
    target_date: "2026-05-02",
  }) as TIssue;

const groups: IGroupByColumn[] = [
  { id: "assignee-a", name: "Assignee A" } as IGroupByColumn,
  { id: "assignee-b", name: "Assignee B" } as IGroupByColumn,
];

test("grouped Gantt adds per-assignee load-more rows without adding selection entities", () => {
  const issues = new Map([["issue-1", issue("issue-1")]]);

  const rows = buildGroupedGanttRows({
    groupedIssueIds: {
      "assignee-a": ["issue-1"],
      "assignee-b": [],
    },
    groups,
    collapsedGroupIds: new Set(),
    canLoadMoreGroupIds: new Set(["assignee-a"]),
    getIssueById: (issueId) => issues.get(issueId),
  });

  assert.deepEqual(
    rows.map((row) => row.rowType),
    ["group", "issue", "load-more"]
  );
  assert.deepEqual(getGroupedGanttSelectionIssueIds(rows), ["issue-1"]);
});

test("grouped Gantt selection ids are issue-based and deduped across assignee groups", () => {
  const issues = new Map([
    ["issue-1", issue("issue-1")],
    ["issue-2", issue("issue-2")],
  ]);

  const rows = buildGroupedGanttRows({
    groupedIssueIds: {
      "assignee-a": ["issue-1", "issue-2"],
      "assignee-b": ["issue-1"],
    },
    groups,
    collapsedGroupIds: new Set(),
    getIssueById: (issueId) => issues.get(issueId),
  });

  assert.deepEqual(getGroupedGanttSelectionIssueIds(rows), ["issue-1", "issue-2"]);
});

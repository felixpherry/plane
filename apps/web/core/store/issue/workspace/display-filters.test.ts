import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWorkspaceDisplayFilters } from "./display-filters";

test("workspace Board falls back to State Group when group is missing or invalid", () => {
  assert.equal(normalizeWorkspaceDisplayFilters({ layout: "kanban" }).group_by, "state_detail.group");
  assert.equal(
    normalizeWorkspaceDisplayFilters({ layout: "kanban", group_by: "priority" }).group_by,
    "state_detail.group"
  );
});

test("workspace Timeline falls back to Assignee when group is missing or invalid", () => {
  assert.equal(normalizeWorkspaceDisplayFilters({ layout: "gantt_chart" }).group_by, "assignees");
  assert.equal(normalizeWorkspaceDisplayFilters({ layout: "gantt_chart", group_by: "priority" }).group_by, "assignees");
});

test("workspace layout normalization preserves the shared group when it is still valid", () => {
  assert.equal(
    normalizeWorkspaceDisplayFilters({ layout: "gantt_chart", group_by: "state_detail.group" }).group_by,
    "state_detail.group"
  );
  assert.equal(
    normalizeWorkspaceDisplayFilters({ layout: "gantt_chart", group_by: "assignees" }).group_by,
    "assignees"
  );
  assert.equal(normalizeWorkspaceDisplayFilters({ layout: "gantt_chart", group_by: "project" }).group_by, "project");
  assert.equal(
    normalizeWorkspaceDisplayFilters({ layout: "kanban", group_by: "state_detail.group" }).group_by,
    "state_detail.group"
  );
  assert.equal(normalizeWorkspaceDisplayFilters({ layout: "kanban", group_by: "assignees" }).group_by, "assignees");
  assert.equal(normalizeWorkspaceDisplayFilters({ layout: "kanban", group_by: "project" }).group_by, "project");
});

test("workspace spreadsheet keeps the existing shared group_by value", () => {
  const displayFilters = normalizeWorkspaceDisplayFilters({
    layout: "spreadsheet",
    group_by: "assignees",
    sub_group_by: "priority",
  });

  assert.equal(displayFilters.group_by, "assignees");
  assert.equal(displayFilters.sub_group_by, "priority");
});

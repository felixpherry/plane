import test from "node:test";
import assert from "node:assert/strict";
import { ISSUE_DISPLAY_FILTERS_BY_PAGE } from "./filter";

test("issue Gantt display filters expose assignee group-by for current and legacy layout keys", () => {
  const layoutOptions = ISSUE_DISPLAY_FILTERS_BY_PAGE.issues.layoutOptions;

  assert.deepEqual(layoutOptions.gantt_chart.display_filters.group_by, ["assignees", null]);
  assert.deepEqual(layoutOptions.gantt.display_filters.group_by, ["assignees", null]);
});

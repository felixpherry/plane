import test from "node:test";
import assert from "node:assert/strict";
import { shouldRenderSubWorkItemIndicator } from "./sub-work-item-indicator.utils";

test("sub-work item indicator only renders for workspace-scoped promoted child issues", () => {
  assert.equal(shouldRenderSubWorkItemIndicator({ parent_id: "parent-1" }, "GLOBAL"), true);
  assert.equal(shouldRenderSubWorkItemIndicator({ parent_id: null }, "GLOBAL"), false);
  assert.equal(shouldRenderSubWorkItemIndicator({ parent_id: "parent-1" }, "PROJECT"), false);
});

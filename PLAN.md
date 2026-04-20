## Context

- Requested change: split **Make a copy** in issue quick actions into two submenu actions:
  1. **Copy in same project** (keep existing behavior)
  2. **Copy in different project** (choose project, then open Add Work Item modal pre-filled from source issue).
- Scope provided by user: `apps/web/core/components/issues/issue-layouts/quick-action-dropdowns/all-issue.tsx`.
- Constraint: no backend changes; this should be UI flow + routing/prefill behavior.

## Approach

- Reuse existing quick-action menu factory (`helper.tsx`) and existing CE helper seam (`copy-menu-helper.tsx`) to convert the current single copy item into a submenu.
- Keep current same-project copy behavior wired to `CreateUpdateIssueModal` prefill payload (`issue + "(copy)" + sourceIssueId`).
- Implement different-project flow through the existing `DuplicateWorkItemModal` hook point (currently stub in CE):
  - open chooser from submenu,
  - choose target project,
  - navigate to `/:workspaceSlug/projects/:projectId/issues`,
  - open Add Work Item modal with copied defaults.
- Reuse existing command-palette create-issue modal infrastructure (`toggleCreateIssueModal`) and extend its data plumbing for prefill, instead of inventing a new standalone modal system.
- For cross-project prefill, carry only safe fields to avoid invalid project-specific references.
  - Include: `name` (as `"<original> (copy)"`), `description_html`, `priority`, `start_date`, `target_date`, `sourceIssueId`.
  - Exclude: project-scoped fields like `state_id`, `module_ids`, `cycle_id`, labels, type, estimates, assignees, etc.

## Files to modify

- `apps/web/core/components/issues/issue-layouts/quick-action-dropdowns/helper.tsx`
- `apps/web/ce/components/issues/issue-layouts/quick-action-dropdowns/copy-menu-helper.tsx`
- `apps/web/ce/components/issues/issue-layouts/quick-action-dropdowns/duplicate-modal.tsx` (currently stub)
- `apps/web/core/store/base-command-palette.store.ts` (extend create-issue modal payload plumbing)
- `apps/web/ce/components/command-palette/modals/work-item-level.tsx` (feed prefill data into `CreateUpdateIssueModal`)
- `packages/i18n/src/locales/en/translations.ts` (add action labels; mirror in other locales as needed by repo convention)
- Potentially command palette store interface/type files if toggle signature is extended.

## Reuse

- Menu generation + nested submenu rendering already exists in quick-action components (`CustomMenu.SubMenu` and `nestedMenuItems`).
- Copy menu factory hook in `helper.tsx` calls `createCopyMenuWithDuplication(...)` (ideal extension seam).
- CE copy helper currently returns base item unchanged in `copy-menu-helper.tsx`.
- `DuplicateWorkItemModal` component exists but is currently a no-op stub in CE.
- Existing project selector UI: `ProjectDropdown` (`core/components/dropdowns/project/dropdown.tsx`).
- Existing global create modal orchestration: `toggleCreateIssueModal(...)` in `base-command-palette.store.ts`, rendered through `ce/components/command-palette/modals/work-item-level.tsx`.
- Existing issue form project-change sanitizer: `getUpdateFormDataForReset` in `packages/utils/src/work-item/modal.ts`.

## Open questions

- ✅ Apply submenu behavior everywhere shared quick-action copy helper is used (Global, Project, Cycle, Module, Work-item detail).
- ✅ Cross-project flow should prefill only safe/common fields.
- ✅ Target project chooser should exclude current project.
- ✅ Use exact labels: “Copy in same project”, “Copy in different project”, backed by i18n keys.
- ✅ Keep project-selection flow silent (no toast); just navigate + open modal.

## Steps

- [ ] Update `createCopyMenuWithDuplication` to return `nestedMenuItems`:
  - same project => existing `setCreateUpdateIssueModal(true)` path,
  - different project => `setDuplicateWorkItemModal(true)` path.
- [ ] Implement `DuplicateWorkItemModal` (project chooser + continue action).
- [ ] Extend command-palette store with optional create-issue prefill payload used when opening modal.
- [ ] In `WorkItemLevelModals`, pass the prefill payload into `CreateUpdateIssueModal`, then clear it when modal closes/submits.
- [ ] On “different project” confirm: close chooser, navigate to target project issues route, open create issue modal constrained to target project, with copied-safe prefill values (silent UX, no toast).
- [ ] Add i18n keys for submenu labels and wire them in copy helper.
- [ ] Verify behavior across all quick-action contexts that share this helper (`all/project/cycle/module/detail`).

## Verification

- Manual:
  - Open quick actions (at least Global + Project + Work item detail).
  - Confirm **Make a copy** is now a submenu with 2 actions.
  - **Copy in same project**: modal opens immediately in current context with copied content.
  - **Copy in different project**: project chooser appears; after selection app navigates to target project issues page and opens Add Work Item with copied-safe fields prefilled.
  - Submit created issue and verify it is created in target project.
- Regression:
  - Existing edit/archive/delete/open-in-new-tab/copy-link actions unchanged.
  - Create modal behavior from other entry points (sidebar add button / empty states / keyboard command) still works.
- Tests/lint:
  - Run frontend lint/typecheck for touched packages and any relevant quick-action tests (if present).

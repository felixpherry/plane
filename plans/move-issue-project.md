# Move work item to different project

## Context

- User wants new quick action: "Move to different project".
- Existing "Copy in different project" submenu already lists target projects in `apps/web/core/components/issues/issue-layouts/quick-action-dropdowns/helper.tsx`.
- Initial code scan shows copy action opens create modal with copied fields, then routes to target project issues page.
- Move is not as simple as patching `project_id`: `IssueCreateSerializer.project_id` is read-only in `apps/api/plane/app/serializers/issue.py`, and update path uses existing `instance.project_id` for assignees/labels.
- Current web update path (`issueService.patchIssue` -> `BaseIssuesStore.issueUpdate`) is scoped under source project URL and optimistically updates lists; it is not designed for cross-project move.
- Code search found cycle transfer endpoint, but no existing issue cross-project move endpoint.

## Approach

- Add menu item next to copy actions using same target-project submenu UX.
- After target project select, show confirmation modal before mutation.
- Add/extend backend support for true cross-project move rather than relying on `project_id` PATCH.
- Backend should validate source issue and target project permissions, assign destination `sequence_id`/project, and drop moved issue properties per product decision.
- Preserve core content only: name/title, description, web links (`IssueLink`), attachments/comments/activity/history, worklogs, reactions/votes, creator/timestamps, and issue type if target project enables/supports same type (otherwise target default/null).
- Drop/reset properties: state -> target default, priority -> none, assignees -> none, labels -> none, dates -> none, estimate -> none, parent -> none, cycle/module -> none, subscribers -> none, mention DB rows -> none, custom field values -> none, page links -> none. Issue relations handled separately by product decision.
- `Issue.parent` is sub-work-item hierarchy, separate from `IssueRelation` rows. Relations are explicit links like duplicate, relates_to, blocked_by/blocking, start_before/start_after, finish_before/finish_after, implemented_by/implements.
- Drop all `IssueRelation` rows involving moved issue via normal soft delete.
- Use normal `.delete()` soft delete for dropped related rows (`IssueAssignee`, `IssueLabel`, `CycleIssue`, `ModuleIssue`, `IssueRelation`, `IssueSubscriber`, `IssueMention`, `CustomFieldValue`, `WorkItemPageLink`); do not hard-delete.
- Preserve comments/attachments/links/activity/worklogs/reactions/votes and update their `project_id` to target project where those models carry project scope.
- Existing `Issue.save()` only assigns `sequence_id` and `IssueSequence` on create; move implementation must explicitly allocate destination sequence under project lock instead of relying on `save()`.
- Confirmation modal can follow existing `AlertModalCore` pattern from `apps/web/core/components/issues/delete-issue-modal.tsx` or `ModalCore` pattern from archive modal.
- Confirmation copy: title "Move work item to different project?"; body warns target project and property loss; primary button "Move work item"; use normal/primary severity, not destructive red.
- Add frontend service/store action that calls move endpoint, removes issue from current source list, refreshes/fetches moved issue in target project, then navigates to moved issue detail in destination project.

## Files to modify

- `apps/web/core/components/issues/issue-layouts/quick-action-dropdowns/helper.tsx`
- `apps/web/core/components/issues/issue-layouts/quick-action-dropdowns/project-issue.tsx`
- all active normal quick-action hosts: `all-issue.tsx`, `cycle-issue.tsx`, `module-issue.tsx`, `issue-detail.tsx`; exclude `archived-issue.tsx`
- `apps/web/core/services/issue/issue.service.ts`
- `apps/web/core/store/issue/helpers/base-issues.store.ts`
- `apps/web/core/hooks/use-issues-actions.tsx`
- Backend route/view/serializer files under `apps/api/plane/app/urls/issue.py` and `apps/api/plane/app/views/issue/base.py` or new move-specific module.
- `apps/api/plane/app/serializers/issue.py` if response serializer/payload validation is added.
- `apps/api/plane/tests/contract/app/...` for new move endpoint tests.
- New/updated move confirmation modal component near existing issue modals, likely `apps/web/core/components/issues/move-issue-modal.tsx` or inline host-specific modal if reuse is simpler.
- Translation files if existing action labels are localized; otherwise follow existing local string pattern in nearby quick actions.

## Reuse

- `targetProjectOptions` in `helper.tsx` filters joined projects with create permission and excludes current project; reuse for move target list.
- `createCopyMenuWithDuplication()` in quick-action dropdowns builds nested menu for same/different project copy.
- `fetchIssue()` in `useIssueDetail()` fetches full issue before cross-project copy.
- `issueService.patchIssue()` and `BaseIssuesStore.issueUpdate()` show current update flow; useful pattern, but not sufficient for move.
- `IssueCreateSerializer.validate()` already enforces project-scoped validity for assignees, labels, state, parent, estimate point.
- `Issue.save()` in `apps/api/plane/db/models/issue.py` shows how default state and per-project sequence are assigned on create; move endpoint should reuse same rules intentionally.
- `AlertModalCore` already used by `DeleteIssueModal`; good fit for move confirmation copy.
- Existing confirmation modal patterns found in issue/project/workspace components; use `AlertModalCore` for concise confirmation.

## Steps

- [x] Confirm product behavior for move side effects and destination eligibility.
- [x] Find existing API/store support for moving an issue between projects. Result: no dedicated endpoint found; normal patch cannot change project.
- [x] Decide product semantics for project-scoped fields during move. Decision: drop properties rather than remap.
- [x] Define exact preserved fields versus dropped fields.
- [x] Decide whether `IssueRelation` rows should be preserved or dropped. Decision: drop all explicit relations involving moved issue. Parent/sub-work-item hierarchy already drops.
- [x] Decide whether web links (`IssueLink`) should be preserved or dropped. Decision: preserve web links and attachments.
- [x] Decide whether subscribers/mentions should be preserved or dropped. Decision: drop subscribers and `IssueMention` rows; keep mention text inside preserved description/comments.
- [x] Decide whether move allowed for archived/deleted/draft/intake/epic work items. Decision: allow only active normal work items; disallow archived, deleted, draft, intake, and epic.
- [x] Decide required permission on source and target projects. Decision: require Admin/Member (create/edit permission) in both source and target; no creator-only exception unless also Admin/Member. Backend must enforce both.
- [x] Decide post-move navigation behavior. Decision: after success, navigate to moved work item detail in destination project (new identifier/sequence).
- [x] Decide move action visibility across quick-action contexts. Decision: show for active normal work items in project, all/workspace, cycle, module, and detail/peek; hide for archived. Cycle/module move drops membership as part of property reset.
- [x] Decide confirmation modal copy and warning severity. Decision: normal primary confirmation; copy lists dropped properties and preserved content.
- [x] Decide target project picker source/filter. Decision: reuse copy target list (`joinedProjectIds` + `projectsWithCreatePermissions` + not current project); backend enforces source/target Admin-Member too.
- [x] Decide API shape/response contract. Decision: `POST /api/workspaces/{slug}/projects/{source_project_id}/issues/{issue_id}/move/` with `{ "target_project_id": "..." }`; return moved issue summary/detail including `id`, `project_id`, `sequence_id`, and `project_identifier` so frontend can route to `generateWorkItemLink()`.
- [x] Decide backend implementation details for soft-delete vs hard-delete of related rows. Decision: soft-delete dropped rows via normal `.delete()`; preserve comments/attachments/links/activity and update their `project_id` to target where needed.
- [x] Decide whether to log a move activity entry. Decision: add one activity entry on moved issue saying it moved from `{source_identifier}-{old_sequence}` to `{target_identifier}-{new_sequence}`; avoid logging individual property-removal spam.
- [x] Decide behavior for custom field values, worklogs, reactions/votes, and page links. Decision: drop custom field values and page links; preserve worklogs with project scope updated; preserve reactions/votes.
- [x] Decide tests needed before finalizing plan.
- [x] Add backend contract tests for successful move: sequence changes to target project, source list no longer includes issue, target detail resolves, preserved content remains, dropped properties/relations are soft-deleted, preserved related rows get target `project_id` where applicable.
- [x] Add backend permission/validation tests: no source permission, no target permission, same target project, archived/draft/intake/epic disallowed, missing target project.
- [x] Add move submenu item using target project options.
- [x] Add confirmation modal state and content.
- [x] Implement backend move action/endpoint if not already present in another package/edition.
- [x] Execute move mutation after confirm; show success/error toast.
- [x] Refresh/remove current list item and route user as decided.
- [x] Add/update translations if required.

## Verification

- Move issue from project quick-action menu to another project.
- Confirm project list excludes current project and inaccessible projects.
- Cancel confirmation leaves issue unchanged.
- Confirm moves issue, updates UI, and destination project shows issue.
- Verify copy-to-different-project behavior unchanged.

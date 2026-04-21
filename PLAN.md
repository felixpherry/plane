## Context

- Goal: allow page editor users to add any supported file, not just images, within project page detail screens.
- Scope provided by user: `apps/web/app/(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/pages/(detail)/[pageId]`.
- Confirmed product requirements:
  1. Non-image files should render as a **compact card** in the editor.
  2. Clicking the card should **open the file in a new tab**.
  3. Supported entry points should include:
     - drag and drop
     - toolbar button
     - slash command (`/file`)
     - clipboard file paste
  4. File support should follow the **existing allowed MIME list** already defined by the editor.
- Initial code scan findings:
  - The page editor already passes a generic `fileHandler` into `CollaborativeDocumentEditorWithRef` via `useEditorConfig(...)`.
  - Upload/duplicate/delete/restore/download asset plumbing is already generic enough to handle non-image files at the app layer.
  - The editor package already distinguishes `image` vs `attachment` in types and drop helpers, and accepts many non-image MIME types.
  - However, editor insertion/rendering is only implemented for images today: the page toolbar exposes only `image`, slash commands expose only `image`, and drag/drop / clipboard-paste currently leave the `attachment` branch empty.
  - Export/markdown helpers also only understand `image-component` today, so attachment cards would need matching parser support if page export/copy flows are expected to preserve them.

## Approach

- Extend the editor package with a dedicated atomic **attachment/file node** (recommended custom element: `attachment-component`) that mirrors the existing image-component lifecycle but renders as a compact file card.
- Reuse the existing generic file upload lifecycle (`TFileHandler`, page asset upload, duplication, deletion, restoration) rather than creating a separate file-upload backend flow.
- Implement attachment insertion in the same command-driven way images work today:
  - toolbar button triggers `executeMenuItemCommand`
  - slash command triggers a new insert helper
  - drag/drop and clipboard file paste route through the existing `DropHandlerPlugin`
- Keep page-level wiring minimal: most of the change belongs in `packages/editor`, while the page route can continue supplying upload/duplicate handlers through `getEditorFileHandlers(...)`.
- Represent non-image files as a compact card with file name / extension / size and a click target that resolves the file URL and opens it in a new tab.
- Update asset duplication / export / markdown metadata handling so attachment cards behave consistently with existing editor copy/paste and page export flows.

## Files to modify

- `apps/web/core/constants/editor.ts`
- `apps/web/core/hooks/use-parse-editor-content.ts`
- `packages/editor/src/core/constants/extension.ts`
- `packages/editor/src/core/helpers/editor-commands.ts`
- `packages/editor/src/core/components/menus/menu-items.ts`
- `packages/editor/src/core/plugins/drop.ts`
- `packages/editor/src/core/extensions/extensions.ts`
- `packages/editor/src/core/extensions/index.ts`
- `packages/editor/src/core/extensions/slash-commands/command-items-list.tsx`
- `packages/editor/src/core/helpers/assets.ts`
- `packages/editor/src/core/types/asset.ts`
- `packages/editor/src/ce/constants/utility.ts`
- `packages/editor/src/ce/types/storage.ts`
- `packages/editor/src/ce/helpers/asset-duplication.ts`
- `packages/utils/src/editor/markdown-parser/custom-components-handler.ts`
- New editor attachment extension/component files under `packages/editor/src/core/extensions/attachment/` (node config, types, node view, compact card UI, uploader)
- Potentially `packages/editor/src/core/props.ts` and/or parser helpers only if internal editor copy/paste of attachment nodes needs extra handling beyond the shared asset-duplication registry

## Reuse

- Page route already wires uploads through `apps/web/app/(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/pages/(detail)/[pageId]/page.tsx`.
- Generic editor file handler assembly already exists in `apps/web/core/hooks/editor/use-editor-config.ts`.
- Editor asset upload/duplicate progress store already exists in `apps/web/core/store/editor/asset.store.ts`.
- Generic project/workspace asset APIs already exist in `apps/web/core/services/file.service.ts`.
- Existing allowed MIME list already covers images + documents + archives + media in `packages/editor/src/core/constants/config.ts`.
- Existing drag/drop + clipboard-file-paste interception already exists in `packages/editor/src/core/plugins/drop.ts`.
- Existing upload/dropzone helpers can be reused for a file card uploader in `packages/editor/src/core/hooks/use-file-upload.ts` and `packages/editor/src/core/helpers/file.ts`.
- Existing command plumbing already supports an `attachment` command key in `packages/editor/src/core/types/editor.ts`; it just lacks a concrete menu item/command implementation.
- Existing image flow is the best structural template for the new attachment node:
  - `packages/editor/src/core/extensions/custom-image/extension-config.ts`
  - `packages/editor/src/core/extensions/custom-image/extension.tsx`
  - `packages/editor/src/core/extensions/custom-image/components/node-view.tsx`
  - `packages/editor/src/core/extensions/custom-image/components/uploader.tsx`
- Existing file metadata helpers are reusable for compact card content:
  - `packages/utils/src/attachment.ts` (`getFileExtension`, `getFileName`, `convertBytesToSize`)
- Existing issue attachment UI demonstrates the desired compact-card ingredients, even if its component cannot be reused directly inside the editor package:
  - `apps/web/core/components/issues/attachment/attachment-list-item.tsx`
  - `apps/web/core/components/icons/attachment/attachment-icon.tsx`
- Existing asset tracking / delete / restore plumbing is generic and can be extended by registering the new node in:
  - `packages/editor/src/ce/constants/utility.ts`
  - `packages/editor/src/core/plugins/file/delete.ts`
  - `packages/editor/src/core/plugins/file/restore.ts`
- Existing asset duplication registry already handles copied image components and can be extended for attachment components in `packages/editor/src/ce/helpers/asset-duplication.ts`.

## Open questions

- No remaining product ambiguities from the initial request.
- One implementation choice to settle during execution: whether the attachment card click should resolve via `getAssetSrc(...)` or `getAssetDownloadSrc(...)` for the best “open in new tab” behavior across file types. The current plan assumes the normal asset URL is the primary open target.

## Steps

- [ ] Add a new editor attachment node under `packages/editor/src/core/extensions/attachment/` that stores at least `id`, `src`, `name`, `size`, and upload status needed to render a compact file card.
- [ ] Register the attachment node in the core editor extension list and block-node metadata so it participates in editor rendering and file lifecycle hooks.
- [ ] Implement `insertAttachment(...)` command plumbing and expose an attachment menu item through `getEditorMenuItems(...)`.
- [ ] Add an Add File toolbar item in `apps/web/core/constants/editor.ts` so the page toolbar can trigger the same “open file picker / insert pending node” behavior that image insertion already uses.
- [ ] Add a `/file` slash-command entry in `packages/editor/src/core/extensions/slash-commands/command-items-list.tsx`.
- [ ] Finish the non-image branch in `packages/editor/src/core/plugins/drop.ts` so drag/drop and clipboard file paste insert attachment nodes, including multi-file sequencing.
- [ ] Reuse `useUploader` / `useDropZone` patterns to upload selected files, resolve URLs, and transition the card from pending/uploading to uploaded.
- [ ] Extend `NODE_FILE_MAP`, storage-key typing, and asset metadata extraction so attachment nodes participate in delete/undo-restore and `onAssetChange` tracking.
- [ ] Extend asset duplication handling so copied attachment cards get fresh IDs / duplicated asset references instead of reusing the original node identity.
- [ ] Update markdown/export parsing so attachment components become meaningful output (likely links) instead of being dropped or left as unknown custom elements.
- [ ] Verify the page detail screen works end-to-end without backend changes because it already provides generic upload/duplicate/delete/restore handlers.

## Verification

- Manual:
  - Open a project page and insert files through all requested entry points:
    - drag/drop
    - clipboard file paste
    - toolbar Add File button
    - slash command `/file`
  - Test with image + non-image files from the existing allowlist (for example: PNG, PDF, TXT, DOCX, ZIP).
  - Confirm images still render as images and non-image files render as compact attachment cards.
  - Click an inserted attachment card and confirm it opens in a new tab.
  - Insert multiple files in one drop/paste/select action and confirm all files appear in sequence.
  - Refresh the page and confirm attachment cards persist and still open correctly.
  - Delete an attachment card, undo/redo, and confirm asset delete/restore behavior remains correct.
  - Copy/paste an existing attachment card inside the editor and verify duplication does not corrupt asset references.
  - Export the page as PDF / Markdown and confirm attachment cards degrade into usable output rather than raw custom tags.
- Regression:
  - Existing image insertion via toolbar, slash command, drag/drop, and clipboard paste still works.
  - Page editor save/load and asset upload progress continue working.
- Code validation:
  - Run editor/web lint + typecheck and any affected editor tests.

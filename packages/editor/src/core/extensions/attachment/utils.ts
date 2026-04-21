/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Editor } from "@tiptap/core";
// local imports
import { EAttachmentAttributeNames, EAttachmentStatus } from "./types";

export const DEFAULT_ATTACHMENT_ATTRIBUTES = {
  [EAttachmentAttributeNames.ID]: null,
  [EAttachmentAttributeNames.SOURCE]: null,
  [EAttachmentAttributeNames.NAME]: null,
  [EAttachmentAttributeNames.SIZE]: null,
  [EAttachmentAttributeNames.STATUS]: EAttachmentStatus.PENDING,
};

export const getAttachmentComponentFileMap = (editor: Editor) => editor.storage.attachmentComponent?.fileMap;

export const hasAttachmentDuplicationFailed = (status: EAttachmentStatus) =>
  status === EAttachmentStatus.DUPLICATION_FAILED;

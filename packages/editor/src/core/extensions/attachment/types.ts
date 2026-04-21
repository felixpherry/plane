/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Node } from "@tiptap/core";
// types
import type { TFileHandler } from "@/types";

export enum EAttachmentAttributeNames {
  ID = "id",
  SOURCE = "src",
  NAME = "name",
  SIZE = "size",
  STATUS = "status",
}

export enum EAttachmentStatus {
  PENDING = "pending",
  UPLOADING = "uploading",
  UPLOADED = "uploaded",
  DUPLICATING = "duplicating",
  DUPLICATION_FAILED = "duplication-failed",
}

export type TAttachmentAttributes = {
  [EAttachmentAttributeNames.ID]: string | null;
  [EAttachmentAttributeNames.SOURCE]: string | null;
  [EAttachmentAttributeNames.NAME]: string | null;
  [EAttachmentAttributeNames.SIZE]: number | null;
  [EAttachmentAttributeNames.STATUS]: EAttachmentStatus;
};

export type UploadEntity = ({ event: "insert" } | { event: "drop"; file: File }) & {
  hasOpenedFileInputOnce?: boolean;
};

export type InsertAttachmentComponentProps = {
  file?: File;
  pos?: number;
  event: "insert" | "drop";
};

export type AttachmentExtensionOptions = {
  getAttachmentDownloadSource: TFileHandler["getAssetDownloadSrc"];
  getAttachmentSource: TFileHandler["getAssetSrc"];
  restoreAttachment: TFileHandler["restore"];
  uploadAttachment?: TFileHandler["upload"];
  duplicateAttachment?: TFileHandler["duplicate"];
};

export type AttachmentExtensionStorage = {
  fileMap: Map<string, UploadEntity>;
  deletedAttachmentSet: Map<string, boolean>;
  maxFileSize: number;
};

export type AttachmentExtensionType = Node<AttachmentExtensionOptions, AttachmentExtensionStorage>;

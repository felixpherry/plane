/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { ReactNodeViewRenderer } from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
// constants
import { ACCEPTED_ATTACHMENT_MIME_TYPES } from "@/constants/config";
// helpers
import { isFileValid } from "@/helpers/file";
import { insertEmptyParagraphAtNodeBoundaries } from "@/helpers/insert-empty-paragraph-at-node-boundary";
import { showEditorErrorToast } from "@/helpers/toast";
// types
import type { TFileHandler } from "@/types";
// local imports
import type { AttachmentNodeViewProps } from "./components/node-view";
import { AttachmentNodeView } from "./components/node-view";
import { AttachmentExtensionConfig } from "./extension-config";
import type { AttachmentExtensionOptions, AttachmentExtensionStorage } from "./types";
import { EAttachmentAttributeNames, EAttachmentStatus } from "./types";
import { getAttachmentComponentFileMap } from "./utils";

type Props = {
  fileHandler: TFileHandler;
  isEditable: boolean;
};

export function AttachmentExtension(options: Props) {
  const { fileHandler, isEditable } = options;
  const { getAssetSrc, getAssetDownloadSrc, restore: restoreAttachmentFn } = fileHandler;

  return AttachmentExtensionConfig.extend<AttachmentExtensionOptions, AttachmentExtensionStorage>({
    selectable: isEditable,
    draggable: isEditable,

    addOptions() {
      const upload = "upload" in fileHandler ? fileHandler.upload : undefined;
      const duplicate = "duplicate" in fileHandler ? fileHandler.duplicate : undefined;

      return {
        ...this.parent?.(),
        getAttachmentDownloadSource: getAssetDownloadSrc,
        getAttachmentSource: getAssetSrc,
        restoreAttachment: restoreAttachmentFn,
        uploadAttachment: upload,
        duplicateAttachment: duplicate,
      };
    },

    addStorage() {
      const maxFileSize = "validation" in fileHandler ? fileHandler.validation?.maxFileSize : 0;

      return {
        fileMap: new Map(),
        deletedAttachmentSet: new Map<string, boolean>(),
        maxFileSize,
      };
    },

    addCommands() {
      return {
        insertAttachmentComponent:
          (commandProps) =>
          ({ commands }) => {
            if (
              commandProps?.file &&
              !isFileValid({
                acceptedMimeTypes: ACCEPTED_ATTACHMENT_MIME_TYPES,
                file: commandProps.file,
                maxFileSize: this.storage.maxFileSize,
                onError: (_error, message) => showEditorErrorToast(message),
              })
            ) {
              return false;
            }

            const fileId = uuidv4();
            const attachmentComponentFileMap = getAttachmentComponentFileMap(this.editor);

            if (attachmentComponentFileMap) {
              if (commandProps?.event === "drop" && commandProps.file) {
                attachmentComponentFileMap.set(fileId, {
                  file: commandProps.file,
                  event: commandProps.event,
                });
              } else if (commandProps.event === "insert") {
                attachmentComponentFileMap.set(fileId, {
                  event: commandProps.event,
                  hasOpenedFileInputOnce: false,
                });
              }
            }

            const fileName = commandProps.file?.name ?? null;
            const fileSize = commandProps.file?.size ?? null;
            const attributes = {
              [EAttachmentAttributeNames.ID]: fileId,
              [EAttachmentAttributeNames.NAME]: fileName,
              [EAttachmentAttributeNames.SIZE]: fileSize,
              [EAttachmentAttributeNames.STATUS]: EAttachmentStatus.PENDING,
            };

            if (commandProps.pos) {
              return commands.insertContentAt(commandProps.pos, {
                type: this.name,
                attrs: attributes,
              });
            }

            return commands.insertContent({
              type: this.name,
              attrs: attributes,
            });
          },
      };
    },

    addKeyboardShortcuts() {
      return {
        ArrowDown: insertEmptyParagraphAtNodeBoundaries("down", this.name),
        ArrowUp: insertEmptyParagraphAtNodeBoundaries("up", this.name),
      };
    },

    addNodeView() {
      return ReactNodeViewRenderer((nodeViewProps) => (
        <AttachmentNodeView {...nodeViewProps} node={nodeViewProps.node as AttachmentNodeViewProps["node"]} />
      ));
    },
  });
}

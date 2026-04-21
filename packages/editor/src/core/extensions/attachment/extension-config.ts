/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { mergeAttributes, Node } from "@tiptap/core";
// constants
import { CORE_EXTENSIONS } from "@/constants/extension";
// local imports
import type {
  AttachmentExtensionOptions,
  AttachmentExtensionStorage,
  AttachmentExtensionType,
  InsertAttachmentComponentProps,
  TAttachmentAttributes,
} from "./types";
import { EAttachmentAttributeNames } from "./types";
import { DEFAULT_ATTACHMENT_ATTRIBUTES } from "./utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    [CORE_EXTENSIONS.ATTACHMENT]: {
      insertAttachmentComponent: (props: InsertAttachmentComponentProps) => ReturnType;
    };
  }

  interface Storage {
    [CORE_EXTENSIONS.ATTACHMENT]: AttachmentExtensionStorage;
  }
}

export const AttachmentExtensionConfig: AttachmentExtensionType = Node.create<
  AttachmentExtensionOptions,
  AttachmentExtensionStorage
>({
  name: CORE_EXTENSIONS.ATTACHMENT,
  group: "block",
  atom: true,

  addAttributes() {
    return Object.values(EAttachmentAttributeNames).reduce(
      (acc, value) => {
        acc[value] = {
          default: DEFAULT_ATTACHMENT_ATTRIBUTES[value],
        };
        return acc;
      },
      {} as Record<EAttachmentAttributeNames, { default: TAttachmentAttributes[EAttachmentAttributeNames] }>
    );
  },

  parseHTML() {
    return [
      {
        tag: "attachment-component",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["attachment-component", mergeAttributes(HTMLAttributes)];
  },
});

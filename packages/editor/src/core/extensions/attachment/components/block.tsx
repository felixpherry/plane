/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { FileText } from "lucide-react";
import { useMemo } from "react";
// plane imports
import { cn, convertBytesToSize, getFileExtension, getFileName } from "@plane/utils";
// local imports
import type { AttachmentNodeViewProps } from "./node-view";

type Props = Pick<AttachmentNodeViewProps, "editor" | "node" | "selected"> & {
  src?: string;
};

export function AttachmentBlock(props: Props) {
  const { editor, node, selected, src } = props;
  const { name, size } = node.attrs;

  const fileExtension = useMemo(() => getFileExtension(name ?? ""), [name]);
  const fileName = useMemo(() => getFileName(name ?? "") || name || "Attachment", [name]);
  const formattedSize = useMemo(() => (typeof size === "number" ? convertBytesToSize(size) : ""), [size]);

  return (
    <button
      id={`attachment-${node.attrs.id ?? ""}`}
      type="button"
      contentEditable={false}
      className={cn(
        "group/attachment-component bg-surface-primary flex w-full cursor-pointer items-center gap-3 rounded-md border border-subtle px-3 py-2 text-left transition-all duration-200 ease-in-out hover:bg-layer-3",
        {
          "border-accent-primary/40 bg-accent-primary/10": selected && editor.isEditable,
        }
      )}
      onClick={() => {
        if (src) {
          window.open(src, "_blank", "noopener,noreferrer");
        }
      }}
    >
      <div className="grid size-8 shrink-0 place-items-center rounded-md bg-layer-3 text-secondary">
        <FileText className="size-4" />
      </div>
      <span className="truncate text-13 font-medium text-primary">{fileName}</span>
      <div className="ml-auto flex items-center gap-2 text-12 text-disabled">
        {fileExtension && <span className="uppercase">{fileExtension}</span>}
        {formattedSize && <span>{formattedSize}</span>}
      </div>
    </button>
  );
}

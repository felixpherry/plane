// eslint-disable
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { FileText, RotateCcw } from "lucide-react";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
// plane imports
import { cn } from "@plane/utils";
// constants
import { ACCEPTED_ATTACHMENT_MIME_TYPES } from "@/constants/config";
// helpers
import type { EFileError } from "@/helpers/file";
// hooks
import { uploadFirstFileAndInsertRemaining, useDropZone, useUploader } from "@/hooks/use-file-upload";
// local imports
import { EAttachmentStatus } from "../types";
import { getAttachmentComponentFileMap } from "../utils";
import type { AttachmentNodeViewProps } from "./node-view";

type AttachmentUploaderProps = AttachmentNodeViewProps & {
  failedToLoadAttachment: boolean;
  hasDuplicationFailed: boolean;
  maxFileSize: number;
  setIsUploaded: (isUploaded: boolean) => void;
};

export function AttachmentUploader(props: AttachmentUploaderProps) {
  const {
    editor,
    extension,
    failedToLoadAttachment,
    getPos,
    hasDuplicationFailed,
    maxFileSize,
    node,
    selected,
    setIsUploaded,
    updateAttributes,
  } = props;
  // refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasTriggeredFilePickerRef = useRef(false);
  const hasTriedUploadingOnMountRef = useRef(false);
  const { id: attachmentEntityId } = node.attrs;
  // derived values
  const attachmentComponentFileMap = useMemo(() => getAttachmentComponentFileMap(editor), [editor]);
  const isTouchDevice = !!editor.storage.utility.isTouchDevice;

  const onUpload = useCallback(
    (url: string, file: File) => {
      if (url) {
        if (!attachmentEntityId) return;
        setIsUploaded(true);
        updateAttributes({
          src: url,
          name: file.name,
          size: file.size,
          status: EAttachmentStatus.UPLOADED,
        });
        attachmentComponentFileMap?.delete(attachmentEntityId);
      }
    },
    [attachmentComponentFileMap, attachmentEntityId, setIsUploaded, updateAttributes]
  );

  const uploadAttachmentEditorCommand = useCallback(
    async (file: File) => {
      updateAttributes({
        name: file.name,
        size: file.size,
        status: EAttachmentStatus.UPLOADING,
      });
      return await extension.options.uploadAttachment?.(attachmentEntityId ?? "", file);
    },
    [attachmentEntityId, extension.options, updateAttributes]
  );

  const handleProgressStatus = useCallback(
    (isUploading: boolean) => {
      editor.storage.utility.uploadInProgress = isUploading;
    },
    [editor]
  );

  const handleInvalidFile = useCallback((_error: EFileError, _file: File, message: string) => {
    alert(message);
  }, []);

  const { isUploading: isAttachmentBeingUploaded, uploadFile } = useUploader({
    acceptedMimeTypes: ACCEPTED_ATTACHMENT_MIME_TYPES,
    editorCommand: uploadAttachmentEditorCommand,
    handleProgressStatus,
    maxFileSize,
    onInvalidFile: handleInvalidFile,
    onUpload,
  });

  const { draggedInside, onDrop, onDragEnter, onDragLeave } = useDropZone({
    editor,
    getPos,
    type: "attachment",
    uploader: uploadFile,
  });

  useEffect(() => {
    if (hasTriedUploadingOnMountRef.current) return;

    const meta = attachmentComponentFileMap?.get(attachmentEntityId ?? "");
    if (meta) {
      if (meta.event === "drop" && "file" in meta) {
        hasTriedUploadingOnMountRef.current = true;
        uploadFile(meta.file);
      } else if (meta.event === "insert" && fileInputRef.current && !hasTriggeredFilePickerRef.current) {
        if (meta.hasOpenedFileInputOnce) return;
        if (!isTouchDevice) {
          fileInputRef.current.click();
        }
        hasTriggeredFilePickerRef.current = true;
        attachmentComponentFileMap?.set(attachmentEntityId ?? "", {
          ...meta,
          hasOpenedFileInputOnce: true,
        });
      }
    } else {
      hasTriedUploadingOnMountRef.current = true;
    }
  }, [attachmentComponentFileMap, attachmentEntityId, isTouchDevice, uploadFile]);

  const onFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      const filesList = e.target.files;
      const pos = getPos();
      if (!filesList || pos === undefined) {
        return;
      }

      await uploadFirstFileAndInsertRemaining({
        editor,
        filesList,
        pos,
        type: "attachment",
        uploader: uploadFile,
      });
    },
    [editor, getPos, uploadFile]
  );

  const isErrorState = failedToLoadAttachment || hasDuplicationFailed;
  const borderColor =
    selected && editor.isEditable && !isErrorState
      ? "color-mix(in srgb, var(--border-color-accent-strong) 20%, transparent)"
      : undefined;

  const getDisplayMessage = useCallback(() => {
    if (isErrorState) {
      return "Error loading file";
    }

    if (isAttachmentBeingUploaded) {
      return "Uploading...";
    }

    if (draggedInside && editor.isEditable) {
      return "Drop file here";
    }

    return "Add a file";
  }, [draggedInside, editor.isEditable, isAttachmentBeingUploaded, isErrorState]);

  const handleRetryClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasDuplicationFailed && editor.isEditable) {
        updateAttributes({ status: EAttachmentStatus.DUPLICATING });
      }
    },
    [editor.isEditable, hasDuplicationFailed, updateAttributes]
  );

  return (
    <div
      className={cn(
        "attachment-upload-component flex cursor-default items-center justify-start gap-2 rounded-lg border border-dashed bg-layer-3 px-3 py-3 text-tertiary transition-all duration-200 ease-in-out",
        {
          "border-subtle": !(selected && editor.isEditable && !isErrorState),
          "cursor-pointer hover:bg-layer-3-hover hover:text-secondary": editor.isEditable && !isErrorState,
          "bg-layer-3-hover text-secondary": draggedInside && editor.isEditable && !isErrorState,
          "bg-accent-primary/10 text-accent-secondary hover:bg-accent-primary/10 hover:text-accent-secondary":
            selected && editor.isEditable && !isErrorState,
          "cursor-default bg-danger-subtle text-danger-primary": isErrorState,
          "hover:bg-danger-subtle-hover hover:text-danger-primary": isErrorState && editor.isEditable,
          "bg-danger-subtle-selected": isErrorState && selected,
          "hover:bg-danger-subtle-active": isErrorState && selected && editor.isEditable,
        }
      )}
      style={borderColor ? { borderColor } : undefined}
      onDrop={onDrop}
      onDragOver={onDragEnter}
      onDragLeave={onDragLeave}
      contentEditable={false}
      onClick={() => {
        if (!failedToLoadAttachment && editor.isEditable && !hasDuplicationFailed) {
          fileInputRef.current?.click();
        }
      }}
    >
      <FileText className="size-4" />
      <div className="flex-1 text-14 font-medium">{getDisplayMessage()}</div>
      {hasDuplicationFailed && editor.isEditable && (
        <button
          type="button"
          onClick={handleRetryClick}
          className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-danger-primary transition-all duration-200 ease-in-out hover:bg-danger-subtle-hover"
          title="Retry duplication"
        >
          <RotateCcw className="size-3" />
          <span className="text-11">Retry</span>
        </button>
      )}
      <input
        className="size-0 overflow-hidden"
        ref={fileInputRef}
        hidden
        type="file"
        accept={ACCEPTED_ATTACHMENT_MIME_TYPES.join(",")}
        onChange={onFileChange}
        multiple
      />
    </div>
  );
}

// eslint-disable
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
// local imports
import type { AttachmentExtensionType, TAttachmentAttributes } from "../types";
import { EAttachmentStatus } from "../types";
import { hasAttachmentDuplicationFailed } from "../utils";
import { AttachmentBlock } from "./block";
import { AttachmentUploader } from "./uploader";

export type AttachmentNodeViewProps = Omit<NodeViewProps, "extension" | "updateAttributes"> & {
  extension: AttachmentExtensionType;
  node: NodeViewProps["node"] & {
    attrs: TAttachmentAttributes;
  };
  updateAttributes: (attrs: Partial<TAttachmentAttributes>) => void;
};

export function AttachmentNodeView(props: AttachmentNodeViewProps) {
  const { editor, extension, node, updateAttributes } = props;
  const { src: attachmentNodeSrc, status } = node.attrs;

  const [isUploaded, setIsUploaded] = useState(!!attachmentNodeSrc);
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(undefined);
  const [failedToLoadAttachment, setFailedToLoadAttachment] = useState(false);

  const hasRetriedOnMount = useRef(false);
  const isDuplicatingRef = useRef(false);

  useEffect(() => {
    if (resolvedSrc || attachmentNodeSrc) {
      setIsUploaded(true);
    } else {
      setIsUploaded(false);
    }
  }, [attachmentNodeSrc, resolvedSrc]);

  useEffect(() => {
    if (!attachmentNodeSrc) {
      setResolvedSrc(undefined);
      return;
    }

    setResolvedSrc(undefined);
    setFailedToLoadAttachment(false);

    const getAttachmentSource = async () => {
      try {
        const url = await extension.options.getAttachmentSource?.(attachmentNodeSrc);
        const fallbackUrl = url || (await extension.options.getAttachmentDownloadSource?.(attachmentNodeSrc));
        setResolvedSrc(fallbackUrl);
      } catch (error) {
        console.error("Error fetching attachment source:", error);
        setFailedToLoadAttachment(true);
      }
    };

    void getAttachmentSource();
  }, [attachmentNodeSrc, extension.options.getAttachmentDownloadSource, extension.options.getAttachmentSource]);

  useEffect(() => {
    const handleDuplication = async () => {
      if (
        status !== EAttachmentStatus.DUPLICATING ||
        !extension.options.duplicateAttachment ||
        !attachmentNodeSrc ||
        isDuplicatingRef.current
      ) {
        return;
      }

      isDuplicatingRef.current = true;
      try {
        hasRetriedOnMount.current = true;
        const newAssetId = await extension.options.duplicateAttachment(attachmentNodeSrc);

        if (!newAssetId) {
          throw new Error("Duplication returned invalid asset ID");
        }

        setFailedToLoadAttachment(false);
        updateAttributes({
          src: newAssetId,
          status: EAttachmentStatus.UPLOADED,
        });
      } catch (error: unknown) {
        console.error("Failed to duplicate attachment:", error);
        updateAttributes({ status: EAttachmentStatus.DUPLICATION_FAILED });
      } finally {
        isDuplicatingRef.current = false;
      }
    };

    void handleDuplication();
  }, [attachmentNodeSrc, extension.options.duplicateAttachment, status, updateAttributes]);

  useEffect(() => {
    if (hasAttachmentDuplicationFailed(status) && !hasRetriedOnMount.current && attachmentNodeSrc) {
      hasRetriedOnMount.current = true;
      updateAttributes({ status: EAttachmentStatus.DUPLICATING });
    }
  }, [attachmentNodeSrc, status, updateAttributes]);

  useEffect(() => {
    if (status === EAttachmentStatus.UPLOADED) {
      hasRetriedOnMount.current = false;
      setFailedToLoadAttachment(false);
    }
  }, [status]);

  const hasDuplicationFailed = hasAttachmentDuplicationFailed(status);
  const shouldShowBlock =
    (isUploaded && resolvedSrc) || (!!attachmentNodeSrc && !failedToLoadAttachment && !hasDuplicationFailed);

  return (
    <NodeViewWrapper key={node.attrs.id}>
      <div className="mx-0 my-2 p-0" data-drag-handle>
        {shouldShowBlock && !hasDuplicationFailed ? (
          <AttachmentBlock src={resolvedSrc} {...props} />
        ) : (
          <AttachmentUploader
            failedToLoadAttachment={failedToLoadAttachment}
            hasDuplicationFailed={hasDuplicationFailed}
            maxFileSize={(editor.storage.attachmentComponent as { maxFileSize?: number } | undefined)?.maxFileSize ?? 0}
            setIsUploaded={setIsUploaded}
            {...props}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
}

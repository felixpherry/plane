/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { setToast, TOAST_TYPE } from "@plane/propel/toast";
import { Tooltip } from "@plane/propel/tooltip";
import type { TIdentifierTextProps, TIdentifierTextVariant, TIssueIdentifierSize } from "@plane/types";
import { cn } from "@plane/utils";
import { CopyCheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SIZE_MAP: Record<TIssueIdentifierSize, string> = {
  xs: "text-caption-sm-regular",
  sm: "text-caption-sm-medium",
  md: "text-caption-md-medium",
  lg: "text-caption-lg-medium",
};

const VARIANT_MAP: Record<TIdentifierTextVariant, string> = {
  default: "text-tertiary",
  secondary: "text-secondary",
  tertiary: "text-tertiary",
  primary: "text-primary",
  "primary-subtle": "text-primary/80",
  success: "text-success-primary",
};

const handleCopyOg = (text: string) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const isCopied = document.execCommand("copy");
    if (!isCopied) throw new Error("Failed to copy text with textarea fallback");
  } finally {
    document.body.removeChild(textArea);
  }
};

const copyTextToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    handleCopyOg(text);
  }
};

export function IdentifierText(props: TIdentifierTextProps) {
  const { identifier, enableClickToCopyIdentifier = false, size = "lg", variant = "default" } = props;
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    },
    []
  );

  // handlers
  const handleCopyIssueIdentifier = async () => {
    if (!enableClickToCopyIdentifier) return;

    try {
      await copyTextToClipboard(identifier);
      setIsCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setIsCopied(false);
        copyTimeoutRef.current = null;
      }, 2000);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Work item ID copied to clipboard",
      });
    } catch {
      console.error("Failed to copy work item ID");
    }
  };

  const textSizeClassName = SIZE_MAP[size];
  const variantClassName = VARIANT_MAP[variant];

  return (
    <Tooltip tooltipContent="Click to copy" disabled={!enableClickToCopyIdentifier} position="top">
      <button
        type="button"
        className={cn(
          "flex items-center gap-1 text-12 font-medium whitespace-nowrap text-tertiary",
          textSizeClassName,
          variantClassName,
          {
            "cursor-pointer": enableClickToCopyIdentifier,
          }
        )}
        onClick={handleCopyIssueIdentifier}
        disabled={!enableClickToCopyIdentifier}
      >
        {identifier}
        {isCopied ? <CopyCheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
      </button>
    </Tooltip>
  );
}

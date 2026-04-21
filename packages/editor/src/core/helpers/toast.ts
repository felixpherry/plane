/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { TOAST_TYPE, setToast } from "@plane/propel/toast";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export const getEditorErrorMessage = (error: unknown, fallback = "Something went wrong. Please try again."): string => {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (!isRecord(error)) {
    return fallback;
  }

  const directMessage = error.error ?? error.message ?? error.detail;
  if (typeof directMessage === "string" && directMessage.trim()) {
    return directMessage;
  }

  const data = error.data;
  if (isRecord(data)) {
    const nestedMessage = data.error ?? data.message ?? data.detail;
    if (typeof nestedMessage === "string" && nestedMessage.trim()) {
      return nestedMessage;
    }
  }

  return fallback;
};

export const showEditorErrorToast = (message: string) => {
  setToast({
    type: TOAST_TYPE.ERROR,
    title: "Error!",
    message,
  });
};

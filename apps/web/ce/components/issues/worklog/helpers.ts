/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { IWorklog } from "@plane/types";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatWorklogDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatWorklogDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return dateTimeFormatter.format(date);
}

export function getWorklogEndTime(worklog: IWorklog): Date | null {
  const startTime = new Date(worklog.logged_at);
  if (Number.isNaN(startTime.getTime())) {
    return null;
  }

  return new Date(startTime.getTime() + worklog.duration * 60 * 1000);
}

export function getWorklogSourceLabel(source: IWorklog["source"]): string {
  return source === "timer" ? "Timer entry" : "Manual entry";
}

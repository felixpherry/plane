/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { CornerDownRight } from "lucide-react";
import { Tooltip } from "@plane/propel/tooltip";
import { cn } from "@plane/utils";

export const SubWorkItemIndicator = ({ className }: { className?: string }) => (
  <Tooltip tooltipContent="Sub-work item">
    <span aria-label="Sub-work item" className={cn("inline-flex flex-shrink-0 items-center text-tertiary", className)}>
      <CornerDownRight className="size-3.5" strokeWidth={2} />
    </span>
  </Tooltip>
);

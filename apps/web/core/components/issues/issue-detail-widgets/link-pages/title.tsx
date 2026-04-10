/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { observer } from "mobx-react";
// plane imports
import type { TIssueServiceType } from "@plane/types";
import { CollapsibleButton } from "@plane/ui";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";

type Props = {
  isOpen: boolean;
  issueId: string;
  issueServiceType: TIssueServiceType;
};

export const WorkItemPageLinksCollapsibleTitle = observer(function WorkItemPageLinksCollapsibleTitle(props: Props) {
  const { isOpen, issueId, issueServiceType } = props;
  const {
    pageLink: { getPageLinkCountByIssueId },
  } = useIssueDetail(issueServiceType);

  const pageCount = getPageLinkCountByIssueId(issueId);

  return (
    <CollapsibleButton
      isOpen={isOpen}
      title={
        <span className="flex items-center gap-2">
          <span>Link pages</span> <span className="text-12 text-disabled">{pageCount}</span>
        </span>
      }
    />
  );
});

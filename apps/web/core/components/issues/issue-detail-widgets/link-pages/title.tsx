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
// local imports
import { WorkItemPageLinksActionButton } from "./quick-action-button";

type Props = {
  isOpen: boolean;
  issueId: string;
  disabled: boolean;
  issueServiceType: TIssueServiceType;
};

export const WorkItemPageLinksCollapsibleTitle = observer(function WorkItemPageLinksCollapsibleTitle(props: Props) {
  const { isOpen, issueId, disabled, issueServiceType } = props;
  const {
    pageLink: { getPageLinkCountByIssueId },
  } = useIssueDetail(issueServiceType);

  const pageCount = getPageLinkCountByIssueId(issueId);

  return (
    <CollapsibleButton
      isOpen={isOpen}
      title={`Link pages ${pageCount}`}
      actionItemElement={
        !disabled && <WorkItemPageLinksActionButton issueServiceType={issueServiceType} disabled={disabled} />
      }
    />
  );
});

/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { observer } from "mobx-react";
// plane imports
import type { TIssueServiceType } from "@plane/types";
import { Collapsible } from "@plane/ui";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// local imports
import { WorkItemPageLinksCollapsibleContent } from "./content";
import { WorkItemPageLinksCollapsibleTitle } from "./title";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  issueServiceType: TIssueServiceType;
};

export const WorkItemPageLinksCollapsible = observer(function WorkItemPageLinksCollapsible(props: Props) {
  const { workspaceSlug, projectId, issueId, issueServiceType } = props;
  const { openWidgets, toggleOpenWidget } = useIssueDetail(issueServiceType);
  const isCollapsibleOpen = openWidgets.includes("link-pages");

  return (
    <Collapsible
      isOpen={isCollapsibleOpen}
      onToggle={() => toggleOpenWidget("link-pages")}
      title={
        <WorkItemPageLinksCollapsibleTitle
          isOpen={isCollapsibleOpen}
          issueId={issueId}
          issueServiceType={issueServiceType}
        />
      }
      buttonClassName="w-full"
    >
      <WorkItemPageLinksCollapsibleContent
        workspaceSlug={workspaceSlug}
        projectId={projectId}
        issueId={issueId}
        issueServiceType={issueServiceType}
      />
    </Collapsible>
  );
});

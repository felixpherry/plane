/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { observer } from "mobx-react";
import { PageIcon } from "@plane/propel/icons";
// plane imports
import type { TIssueServiceType } from "@plane/types";
import { getPageName } from "@plane/utils";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import Link from "next/link";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  issueServiceType: TIssueServiceType;
};

export const WorkItemPageLinksCollapsibleContent = observer(function WorkItemPageLinksCollapsibleContent(props: Props) {
  const { workspaceSlug, projectId, issueId, issueServiceType } = props;
  const {
    pageLink: { getLinkById, getLinksByIssueId },
  } = useIssueDetail(issueServiceType);

  const linkedPageIds = getLinksByIssueId(issueId);
  if (!linkedPageIds) return null;

  return (
    <div className="flex flex-col gap-2 pt-4">
      {linkedPageIds.map((linkId) => {
        const link = getLinkById(linkId);
        const page = link?.page_detail;
        if (!link || !page?.id) return null;

        return (
          <Link
            key={link.id}
            type="button"
            className="group flex h-10 w-full items-center gap-2 rounded-sm border-[0.5px] border-subtle bg-surface-2 px-3 text-left hover:bg-layer-1"
            href={`/${workspaceSlug}/projects/${projectId}/pages/${page.id}`}
          >
            <PageIcon className="size-4 shrink-0 text-tertiary group-hover:text-primary" />
            <span className="min-w-0 flex-1 truncate text-body-xs-regular text-primary">{getPageName(page.name)}</span>
          </Link>
        );
      })}
    </div>
  );
});

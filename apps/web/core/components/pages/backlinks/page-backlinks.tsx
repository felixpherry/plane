// eslint-disable
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import Link from "next/link";
import useSWR from "swr";
// plane imports
import { WorkItemsIcon } from "@plane/propel/icons";
import type { TPageBacklink } from "@plane/types";
// services
import { ProjectPageService } from "@/services/page";

const projectPageService = new ProjectPageService();
const EMPTY_BACKLINKS: TPageBacklink[] = [];

type Props = {
  workspaceSlug: string;
  projectId?: string;
  pageId?: string;
  className?: string;
};

export function PageBacklinks(props: Props) {
  const { workspaceSlug, projectId, pageId, className } = props;
  const backlinksKey =
    workspaceSlug && projectId && pageId ? `PAGE_BACKLINKS_${workspaceSlug}_${projectId}_${pageId}` : null;

  const { data: backlinks = EMPTY_BACKLINKS } = useSWR<TPageBacklink[]>(
    backlinksKey,
    backlinksKey && projectId && pageId
      ? () => projectPageService.fetchBacklinks(workspaceSlug, projectId, pageId)
      : null,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
    }
  );

  if (!backlinks.length || !projectId || !pageId) return null;

  return (
    <section className={className} aria-label="Linked issues">
      <div className="border-custom-border-200 border-t pt-5">
        <div className="text-15 mb-3 flex items-center gap-2 font-medium text-primary">
          <span>Linked issues</span>
          <span className="font-normal text-13 text-secondary">{backlinks.length}</span>
        </div>
        <div className="space-y-2">
          {backlinks.map((backlink) => {
            const issue = backlink.issue_detail;
            const identifier = `${issue.project_detail.identifier}-${issue.sequence_id}`;

            return (
              <Link
                key={backlink.id}
                href={`/${workspaceSlug}/projects/${issue.project_id}/issues/${issue.id}`}
                className="border-custom-border-200 bg-custom-background-100 hover:bg-custom-background-90 flex items-center gap-2 rounded border px-3 py-2 text-13 text-primary"
              >
                <WorkItemsIcon className="size-4 flex-shrink-0 text-secondary" />
                <span className="flex-shrink-0 text-secondary">{identifier}</span>
                <span className="truncate">{issue.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

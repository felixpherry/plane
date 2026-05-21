// eslint-disable
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
// plane imports
import { WorkItemsIcon } from "@plane/propel/icons";
import type { TPageBacklink } from "@plane/types";
import { Collapsible, CollapsibleButton } from "@plane/ui";
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
  const [isOpen, setIsOpen] = useState(true);
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

  const indicatorElement = useMemo(
    () => (
      <span className="flex items-center justify-center">
        <p className="text-14 !leading-3 text-tertiary">{backlinks.length}</p>
      </span>
    ),
    [backlinks.length]
  );

  if (!backlinks.length || !projectId || !pageId) return null;

  return (
    <section className={className} aria-label="Linked issues">
      <div className="pt-5">
        <Collapsible
          isOpen={isOpen}
          onToggle={() => setIsOpen((currentValue) => !currentValue)}
          title={<CollapsibleButton isOpen={isOpen} title="Linked issues" indicatorElement={indicatorElement} />}
          buttonClassName="w-full"
        >
          <div className="flex flex-col gap-2 pt-4">
            {backlinks.map((backlink) => {
              const issue = backlink.issue_detail;
              const identifier = `${issue.project_detail.identifier}-${issue.sequence_id}`;

              return (
                <Link
                  key={backlink.id}
                  href={`/${workspaceSlug}/projects/${issue.project_id}/issues/${issue.id}`}
                  className="group flex h-10 w-full items-center gap-2 rounded-sm border-[0.5px] border-subtle bg-surface-2 px-3 text-left hover:bg-layer-1"
                >
                  <WorkItemsIcon className="size-4 shrink-0 text-tertiary group-hover:text-primary" />
                  <span className="shrink-0 text-body-xs-regular text-tertiary">{identifier}</span>
                  <span className="min-w-0 flex-1 truncate text-body-xs-regular text-primary">{issue.name}</span>
                </Link>
              );
            })}
          </div>
        </Collapsible>
      </div>
    </section>
  );
}

/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { ProjectIcon } from "@plane/propel/icons";
import type { TIssue } from "@plane/types";
import { Row } from "@plane/ui";
import { useProject } from "@/hooks/store/use-project";

type Props = {
  issue: TIssue;
};

export const SpreadsheetProjectColumn = observer(function SpreadsheetProjectColumn(props: Props) {
  const { issue } = props;
  const { getProjectById } = useProject();

  const project = getProjectById(issue.project_id);
  const projectLabel = project?.name?.trim() || "Unknown project";
  const projectIdentifier = project?.identifier?.trim();

  return (
    <Row className="flex h-11 w-full items-center gap-2 border-b-[0.5px] border-subtle px-page-x text-13 group-[.selected-issue-row]:bg-accent-primary/5 hover:bg-layer-1 group-[.selected-issue-row]:hover:bg-accent-primary/10">
      <ProjectIcon className="size-3.5 flex-shrink-0 text-placeholder" />
      <div className="flex min-w-0 items-center gap-2 truncate">
        {projectIdentifier && (
          <span className="flex-shrink-0 rounded-sm bg-layer-2 px-1.5 py-0.5 text-11 font-medium text-secondary">
            {projectIdentifier}
          </span>
        )}
        <span className="truncate text-primary">{projectLabel}</span>
      </div>
    </Row>
  );
});

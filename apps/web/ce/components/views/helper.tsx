/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { EIssueLayoutTypes, IProjectView } from "@plane/types";
import { EIssueLayoutTypes as IssueLayoutTypes } from "@plane/types";
import { LayoutSelection } from "@/components/issues/issue-layouts/filters/header/layout-selection";
import { WorkspaceGanttLayout } from "@/components/issues/issue-layouts/gantt/roots/workspace-root";
import { WorkspaceKanBanLayout } from "@/components/issues/issue-layouts/kanban/roots/workspace-root";
import type { TWorkspaceLayoutProps } from "@/components/views/helper";

export type TLayoutSelectionProps = {
  onChange: (layout: EIssueLayoutTypes) => void;
  selectedLayout: EIssueLayoutTypes;
  workspaceSlug: string;
};

export function GlobalViewLayoutSelection(props: TLayoutSelectionProps) {
  const { onChange, selectedLayout } = props;

  return (
    <LayoutSelection
      layouts={[IssueLayoutTypes.SPREADSHEET, IssueLayoutTypes.KANBAN, IssueLayoutTypes.GANTT]}
      onChange={onChange}
      selectedLayout={selectedLayout}
    />
  );
}

export function WorkspaceAdditionalLayouts(props: TWorkspaceLayoutProps) {
  const { activeLayout } = props;

  if (activeLayout === IssueLayoutTypes.KANBAN) {
    return <WorkspaceKanBanLayout />;
  }

  if (activeLayout === IssueLayoutTypes.GANTT) {
    return <WorkspaceGanttLayout />;
  }

  return <></>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AdditionalHeaderItems(view: IProjectView) {
  return <></>;
}

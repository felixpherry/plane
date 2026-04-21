/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ISvgIcons } from "@plane/propel/icons";
import type { TContextMenuItem } from "@plane/ui";

export interface CopyMenuHelperProps {
  baseItem: {
    key: string;
    title: string;
    icon: React.FC<ISvgIcons>;
    action: () => void;
    shouldRender: boolean;
  };
  activeLayout: string;
  setCreateUpdateIssueModal: (open: boolean) => void;
  workspaceSlug?: string;
  sameProjectTitle: string;
  differentProjectTitle: string;
  differentProjectMenuItems?: TContextMenuItem[];
}

export const createCopyMenuWithDuplication = (props: CopyMenuHelperProps): TContextMenuItem => {
  const { baseItem, setCreateUpdateIssueModal, sameProjectTitle, differentProjectTitle, differentProjectMenuItems } =
    props;

  const resolvedDifferentProjectMenuItems = differentProjectMenuItems ?? [];

  return {
    ...baseItem,
    nestedMenuItems: [
      {
        key: "copy-in-same-project",
        title: sameProjectTitle,
        action: () => setCreateUpdateIssueModal(true),
      },
      {
        key: "copy-in-different-project",
        title: differentProjectTitle,
        action: () => undefined,
        disabled: resolvedDifferentProjectMenuItems.length === 0,
        nestedMenuItems: resolvedDifferentProjectMenuItems.length > 0 ? resolvedDifferentProjectMenuItems : undefined,
      },
    ],
  };
};

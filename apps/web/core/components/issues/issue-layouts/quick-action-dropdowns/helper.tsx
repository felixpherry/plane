// eslint-disable
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo } from "react";
import { XCircle, ArchiveRestoreIcon } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
// plane imports
import { useTranslation } from "@plane/i18n";
import { LinkIcon, CopyIcon, NewTabIcon, EditIcon, ArchiveIcon, TrashIcon, TransferIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { EIssuesStoreType, type TIssue } from "@plane/types";
import type { TContextMenuItem } from "@plane/ui";
import { copyUrlToClipboard, generateWorkItemLink } from "@plane/utils";
// types
import { createCopyMenuWithDuplication } from "@/plane-web/components/issues/issue-layouts/quick-action-dropdowns";
import { useAppRouter } from "@/hooks/use-app-router";
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useProject } from "@/hooks/store/use-project";
import { useUser } from "@/hooks/store/user";

// Generic helper function to handle optional function calls gracefully
// Overload for functions without parameters
export function handleOptionalAction(
  optionalFn: (() => void) | (() => Promise<void>) | undefined,
  actionName: string
): void;

// Overload for functions with one parameter
export function handleOptionalAction<T>(
  optionalFn: ((param: T) => void) | ((param: T) => Promise<void>) | undefined,
  actionName: string,
  param: T
): void;

// Implementation
export function handleOptionalAction<T>(
  optionalFn: (() => void) | (() => Promise<void>) | ((param: T) => void) | ((param: T) => Promise<void>) | undefined,
  actionName: string,
  param?: T
): void {
  if (optionalFn) {
    if (param !== undefined) {
      (optionalFn as (param: T) => void | Promise<void>)(param);
    } else {
      (optionalFn as () => void | Promise<void>)();
    }
  } else {
    setToast({
      type: TOAST_TYPE.ERROR,
      title: "Action not available",
      message: `${actionName} action is not implemented.`,
    });
  }
}

export type TMoveIssueProject = {
  id: string;
  name: string;
};

export interface MenuItemFactoryProps {
  issue: TIssue;
  workspaceSlug?: string;
  projectIdentifier?: string;
  activeLayout?: string;
  isEditingAllowed: boolean;
  isArchivingAllowed?: boolean;
  isDeletingAllowed: boolean;
  isRestoringAllowed?: boolean;
  isInArchivableGroup?: boolean;
  issueTypeDetail?: { is_active?: boolean };
  // Action handlers
  setIssueToEdit: (issue: TIssue | undefined) => void;
  setCreateUpdateIssueModal: (open: boolean) => void;
  setDeleteIssueModal: (open: boolean) => void;
  setArchiveIssueModal?: (open: boolean) => void;
  setMoveIssueProject?: (project: TMoveIssueProject | undefined) => void;
  handleRemoveFromView?: () => void;
  handleRestore?: () => Promise<void>;
  // External handlers
  handleDelete?: () => Promise<void>;
  handleUpdate?: (data: TIssue) => Promise<void>;
  handleArchive?: () => Promise<void>;
  // Context-specific data
  cycleId?: string;
  moduleId?: string;
  storeType?: EIssuesStoreType;
}

// Common action handlers hook
export const useIssueActionHandlers = (props: MenuItemFactoryProps) => {
  const { issue, workspaceSlug, projectIdentifier, handleRestore } = props;

  const workItemLink = useMemo(
    () =>
      generateWorkItemLink({
        workspaceSlug,
        projectId: issue?.project_id,
        issueId: issue?.id,
        projectIdentifier,
        sequenceId: issue?.sequence_id,
      }),
    [workspaceSlug, projectIdentifier, issue]
  );

  const handleCopyIssueLink = () =>
    copyUrlToClipboard(workItemLink).then(() =>
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Link copied",
        message: "Work item link copied to clipboard",
      })
    );

  const handleOpenInNewTab = () => window.open(workItemLink, "_blank");

  const handleIssueRestore = async () => {
    if (!handleRestore) {
      handleOptionalAction(handleRestore, "Restore");
      return;
    }
    await handleRestore()
      .then(() => {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Restore success",
          message: "Your work item can be found in project work items.",
        });
      })
      .catch(() => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: "Work item could not be restored. Please try again.",
        });
      });
  };

  return {
    workItemLink,
    handleCopyIssueLink,
    handleOpenInNewTab,
    handleIssueRestore,
  };
};

const prepareDescriptionForCrossProjectCopy = (descriptionHtml: string | undefined): string | undefined => {
  if (!descriptionHtml) return descriptionHtml;

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = descriptionHtml;

  const imageComponents = tempDiv.querySelectorAll("image-component");
  imageComponents.forEach((element) => {
    const src = element.getAttribute("src");

    if (!src || src.startsWith("http")) return;

    element.setAttribute("status", "duplicating");
    element.setAttribute("id", uuidv4());
  });

  return tempDiv.innerHTML;
};

export const useMenuItemFactory = (props: MenuItemFactoryProps) => {
  const { t } = useTranslation();
  const actionHandlers = useIssueActionHandlers(props);
  const router = useAppRouter();
  const { toggleCreateIssueModal } = useCommandPalette();
  const { fetchIssue } = useIssueDetail();
  const { joinedProjectIds, getProjectById } = useProject();
  const { projectsWithCreatePermissions } = useUser();

  const {
    issue,
    activeLayout = "",
    isEditingAllowed,
    isArchivingAllowed = false,
    isDeletingAllowed,
    isRestoringAllowed = false,
    isInArchivableGroup = false,
    issueTypeDetail,
    setIssueToEdit,
    setCreateUpdateIssueModal,
    setDeleteIssueModal,
    setArchiveIssueModal,
    setMoveIssueProject,
    handleRemoveFromView,
  } = props;

  const targetProjectOptions = useMemo(
    () =>
      joinedProjectIds
        .filter(
          (targetProjectId) =>
            targetProjectId !== issue.project_id &&
            !!projectsWithCreatePermissions?.[targetProjectId] &&
            !!getProjectById(targetProjectId)?.name
        )
        .map((targetProjectId) => ({
          id: targetProjectId,
          name: getProjectById(targetProjectId)?.name ?? "",
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [joinedProjectIds, issue.project_id, projectsWithCreatePermissions, getProjectById]
  );

  const handleCopyToDifferentProject = async (targetProjectId: string) => {
    const workspaceSlug = props.workspaceSlug?.toString();
    if (!workspaceSlug || !issue.project_id) return;

    const sourceIssue = (await fetchIssue(workspaceSlug, issue.project_id, issue.id).catch(() => undefined)) ?? issue;

    toggleCreateIssueModal(true, EIssuesStoreType.PROJECT, [targetProjectId], {
      name: sourceIssue.name,
      description_html: prepareDescriptionForCrossProjectCopy(sourceIssue.description_html),
      priority: sourceIssue.priority,
      start_date: sourceIssue.start_date,
      target_date: sourceIssue.target_date,
      project_id: targetProjectId,
    });

    router.push(`/${workspaceSlug}/projects/${targetProjectId}/issues`);
  };

  const createEditMenuItem = (customEditAction?: () => void): TContextMenuItem => ({
    key: "edit",
    title: t("common.actions.edit"),
    icon: EditIcon,
    action:
      customEditAction ||
      (() => {
        setIssueToEdit(issue);
        setCreateUpdateIssueModal(true);
      }),
    shouldRender: isEditingAllowed,
  });

  const createCopyMenuItem = (workspaceSlug?: string): TContextMenuItem => {
    const baseItem = {
      key: "make-a-copy",
      title: t("common.actions.make_a_copy"),
      icon: CopyIcon,
      action: () => {
        setCreateUpdateIssueModal(true);
      },
      shouldRender: isEditingAllowed && (issueTypeDetail?.is_active ?? true),
    };

    return createCopyMenuWithDuplication({
      baseItem,
      activeLayout,
      setCreateUpdateIssueModal,
      workspaceSlug,
      sameProjectTitle: t("common.actions.copy_in_same_project"),
      differentProjectTitle: t("common.actions.copy_in_different_project"),
      differentProjectMenuItems: targetProjectOptions.map((targetProject) => ({
        key: `copy-to-project-${targetProject.id}`,
        title: targetProject.name,
        action: () => {
          void handleCopyToDifferentProject(targetProject.id);
        },
      })),
    });
  };

  const createMoveMenuItem = (): TContextMenuItem => ({
    key: "move-to-different-project",
    title: t("common.actions.move_to_different_project"),
    icon: TransferIcon,
    action: () => undefined,
    shouldRender: isEditingAllowed && !issue.archived_at && !issue.is_draft && !issue.is_intake && !issue.is_epic,
    disabled: targetProjectOptions.length === 0,
    nestedMenuItems:
      targetProjectOptions.length > 0
        ? targetProjectOptions.map((targetProject) => ({
            key: `move-to-project-${targetProject.id}`,
            title: targetProject.name,
            action: () => {
              setMoveIssueProject?.(targetProject);
            },
          }))
        : undefined,
  });

  const createOpenInNewTabMenuItem = (): TContextMenuItem => ({
    key: "open-in-new-tab",
    title: t("common.actions.open_in_new_tab"),
    icon: NewTabIcon,
    action: actionHandlers.handleOpenInNewTab,
  });

  const createCopyLinkMenuItem = (): TContextMenuItem => ({
    key: "copy-link",
    title: t("common.actions.copy_link"),
    icon: LinkIcon,
    action: actionHandlers.handleCopyIssueLink,
  });

  const createRemoveFromCycleMenuItem = (): TContextMenuItem => ({
    key: "remove-from-cycle",
    title: "Remove from cycle",
    icon: XCircle,
    action: () => handleOptionalAction(handleRemoveFromView, "Remove from cycle"),
    shouldRender: isEditingAllowed,
  });

  const createRemoveFromModuleMenuItem = (): TContextMenuItem => ({
    key: "remove-from-module",
    title: "Remove from module",
    icon: XCircle,
    action: () => handleOptionalAction(handleRemoveFromView, "Remove from module"),
    shouldRender: isEditingAllowed,
  });

  const createArchiveMenuItem = (): TContextMenuItem => ({
    key: "archive",
    title: t("common.actions.archive"),
    description: isInArchivableGroup ? undefined : t("issue.archive.description"),
    icon: ArchiveIcon,
    className: "items-start",
    iconClassName: "mt-1",
    action: () => handleOptionalAction(setArchiveIssueModal, "Archive", true),
    disabled: !isInArchivableGroup,
    shouldRender: isArchivingAllowed,
  });

  const createRestoreMenuItem = (): TContextMenuItem => ({
    key: "restore",
    title: "Restore",
    icon: ArchiveRestoreIcon,
    action: actionHandlers.handleIssueRestore,
    shouldRender: isRestoringAllowed,
  });

  const createDeleteMenuItem = (): TContextMenuItem => ({
    key: "delete",
    title: t("common.actions.delete"),
    icon: TrashIcon,
    action: () => {
      setDeleteIssueModal(true);
    },
    shouldRender: isDeletingAllowed,
  });

  return {
    ...actionHandlers,
    createEditMenuItem,
    createCopyMenuItem,
    createMoveMenuItem,
    createOpenInNewTabMenuItem,
    createCopyLinkMenuItem,
    createRemoveFromCycleMenuItem,
    createRemoveFromModuleMenuItem,
    createArchiveMenuItem,
    createRestoreMenuItem,
    createDeleteMenuItem,
  };
};

// Predefined menu item sets for different contexts
export const useProjectIssueMenuItems = (props: MenuItemFactoryProps): TContextMenuItem[] => {
  const factory = useMenuItemFactory(props);

  return useMemo(
    () => [
      factory.createEditMenuItem(),
      factory.createCopyMenuItem(),
      factory.createMoveMenuItem(),
      factory.createOpenInNewTabMenuItem(),
      factory.createCopyLinkMenuItem(),
      factory.createArchiveMenuItem(),
      factory.createDeleteMenuItem(),
    ],
    [factory]
  );
};

export const useWorkItemDetailMenuItems = (props: MenuItemFactoryProps): TContextMenuItem[] => {
  const factory = useMenuItemFactory(props);

  return useMemo(
    () => [
      factory.createCopyMenuItem(props.workspaceSlug),
      factory.createMoveMenuItem(),
      factory.createOpenInNewTabMenuItem(),
      factory.createArchiveMenuItem(),
      factory.createRestoreMenuItem(),
      factory.createDeleteMenuItem(),
    ],
    [factory]
  );
};

export const useAllIssueMenuItems = (props: MenuItemFactoryProps): TContextMenuItem[] => {
  const factory = useMenuItemFactory(props);

  return useMemo(
    () => [
      factory.createEditMenuItem(),
      factory.createCopyMenuItem(),
      factory.createMoveMenuItem(),
      factory.createOpenInNewTabMenuItem(),
      factory.createCopyLinkMenuItem(),
      factory.createArchiveMenuItem(),
      factory.createDeleteMenuItem(),
    ],
    [factory]
  );
};

export const useCycleIssueMenuItems = (props: MenuItemFactoryProps): TContextMenuItem[] => {
  const factory = useMenuItemFactory(props);

  const customEditAction = () => {
    props.setIssueToEdit({
      ...props.issue,
      cycle_id: props.cycleId ?? null,
    });
    props.setCreateUpdateIssueModal(true);
  };

  return useMemo(
    () => [
      factory.createEditMenuItem(customEditAction),
      factory.createCopyMenuItem(),
      factory.createMoveMenuItem(),
      factory.createOpenInNewTabMenuItem(),
      factory.createCopyLinkMenuItem(),
      factory.createRemoveFromCycleMenuItem(),
      factory.createArchiveMenuItem(),
      factory.createDeleteMenuItem(),
    ],
    [factory, props.cycleId]
  );
};

export const useModuleIssueMenuItems = (props: MenuItemFactoryProps): TContextMenuItem[] => {
  const factory = useMenuItemFactory(props);

  const customEditAction = () => {
    props.setIssueToEdit({
      ...props.issue,
      module_ids: props.moduleId ? [props.moduleId] : [],
    });
    props.setCreateUpdateIssueModal(true);
  };

  return useMemo(
    () => [
      factory.createEditMenuItem(customEditAction),
      factory.createCopyMenuItem(),
      factory.createMoveMenuItem(),
      factory.createOpenInNewTabMenuItem(),
      factory.createCopyLinkMenuItem(),
      factory.createRemoveFromModuleMenuItem(),
      factory.createArchiveMenuItem(),
      factory.createDeleteMenuItem(),
    ],
    [factory, props.moduleId]
  );
};

export const useArchivedIssueMenuItems = (props: MenuItemFactoryProps): TContextMenuItem[] => {
  const factory = useMenuItemFactory(props);

  return useMemo(
    () => [
      factory.createRestoreMenuItem(),
      factory.createOpenInNewTabMenuItem(),
      factory.createCopyLinkMenuItem(),
      factory.createDeleteMenuItem(),
    ],
    [factory]
  );
};

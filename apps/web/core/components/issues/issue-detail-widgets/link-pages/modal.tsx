/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { EPageAccess } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { PlusIcon, SearchIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
// plane imports
import { WorkItemPageLinkService } from "@plane/services";
import type { TIssueServiceType, TPage, TWorkItemPageLink } from "@plane/types";
import { Button, Checkbox, EModalPosition, EModalWidth, Input, Loader, ModalCore } from "@plane/ui";
import { getPageName } from "@plane/utils";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useProject } from "@/hooks/store/use-project";
// services
import { ProjectPageService } from "@/services/page";
// plane web hooks
import { EPageStoreType, usePageStore } from "@/plane-web/hooks/store";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
  isOpen: boolean;
  onClose: () => void;
  issueServiceType: TIssueServiceType;
};

const projectPageService = new ProjectPageService();
const workItemPageLinkService = new WorkItemPageLinkService();
const EMPTY_PAGES: TPage[] = [];
const EMPTY_LINKED_PAGES: TWorkItemPageLink[] = [];

const arePageIdsEqual = (selectedPageIds: Set<string>, linkedPageIds: string[]) =>
  selectedPageIds.size === linkedPageIds.length && linkedPageIds.every((pageId) => selectedPageIds.has(pageId));

type UnsavedPageLinksModalProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  isCreatingPage: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onSave: () => void;
};

function UnsavedPageLinksModal(props: UnsavedPageLinksModalProps) {
  const { isOpen, isSubmitting, isCreatingPage, onClose, onDiscard, onSave } = props;
  const isBusy = isSubmitting || isCreatingPage;

  return (
    <ModalCore isOpen={isOpen} handleClose={onClose} position={EModalPosition.CENTER} width={EModalWidth.XL}>
      <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <div className="text-center sm:text-left">
          <h3 className="text-16 leading-6 font-medium text-primary">Save page link changes?</h3>
          <p className="mt-2 text-13 text-secondary">
            You have unsaved page link changes. Save or discard them before creating a new page.
          </p>
        </div>
      </div>
      <div className="flex justify-between gap-2 p-4 sm:px-6">
        <Button variant="neutral-primary" onClick={onDiscard} loading={isCreatingPage} disabled={isBusy}>
          Discard changes
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="neutral-primary" onClick={onClose} disabled={isBusy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSave} loading={isSubmitting || isCreatingPage} disabled={isBusy}>
            Save changes
          </Button>
        </div>
      </div>
    </ModalCore>
  );
}

export const WorkItemPageLinksModal = observer(function WorkItemPageLinksModal(props: Props) {
  const { workspaceSlug, projectId, issueId, disabled, isOpen, onClose, issueServiceType } = props;
  const { t } = useTranslation();
  const router = useRouter();
  const {
    issue: { getIssueById },
    pageLink: { replacePageLinks },
  } = useIssueDetail(issueServiceType);
  const { getProjectIdentifierById } = useProject();
  const { canCurrentUserCreatePage } = usePageStore(EPageStoreType.PROJECT);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [isCreateConfirmOpen, setIsCreateConfirmOpen] = useState(false);

  const pagesKey =
    isOpen && workspaceSlug && projectId ? `WORK_ITEM_PAGE_LINKS_PAGES_${workspaceSlug}_${projectId}` : null;
  const linkedPagesKey =
    isOpen && workspaceSlug && projectId && issueId
      ? `WORK_ITEM_PAGE_LINKS_${workspaceSlug}_${projectId}_${issueId}`
      : null;

  const {
    data: pages = EMPTY_PAGES,
    error: pagesError,
    isLoading: isPagesLoading,
    mutate: mutatePages,
  } = useSWR<TPage[]>(pagesKey, pagesKey ? () => projectPageService.fetchAll(workspaceSlug, projectId) : null, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
  });

  const {
    data: linkedPages = EMPTY_LINKED_PAGES,
    error: linkedPagesError,
    isLoading: isLinkedPagesLoading,
    mutate: mutateLinkedPages,
  } = useSWR<TWorkItemPageLink[]>(
    linkedPagesKey,
    linkedPagesKey ? () => workItemPageLinkService.list(workspaceSlug, projectId, issueId) : null,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
    }
  );

  const isLoading = isPagesLoading || isLinkedPagesLoading;
  const linkedPageIds = useMemo(() => linkedPages.map((link) => link.page), [linkedPages]);
  const hasUnsavedChanges = useMemo(
    () => !arePageIdsEqual(selectedPageIds, linkedPageIds),
    [linkedPageIds, selectedPageIds]
  );
  const issue = getIssueById(issueId);
  const issueProjectId = issue?.project_id ?? projectId;
  const projectIdentifier = getProjectIdentifierById(issueProjectId);
  const issueIdentifier = issue && projectIdentifier ? `${projectIdentifier}-${issue.sequence_id}` : undefined;
  const isNewPageButtonDisabled = disabled || isLoading || isSubmitting || isCreatingPage || !issueIdentifier;

  useEffect(() => {
    if (!isOpen) {
      setSelectedPageIds((currentPageIds) => (currentPageIds.size === 0 ? currentPageIds : new Set()));
      return;
    }

    const nextPageIds = new Set(linkedPageIds);
    setSelectedPageIds((currentPageIds) => {
      if (
        currentPageIds.size === nextPageIds.size &&
        Array.from(currentPageIds).every((pageId) => nextPageIds.has(pageId))
      ) {
        return currentPageIds;
      }

      return nextPageIds;
    });
  }, [isOpen, linkedPageIds]);

  useEffect(() => {
    if (!isOpen) return;
    if (!pagesError && !linkedPagesError) return;

    setToast({
      type: TOAST_TYPE.ERROR,
      title: t("error"),
      message: t("issue.link_pages.load_failed"),
    });
  }, [isOpen, linkedPagesError, pagesError, t]);

  const filteredPages = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const visiblePages = pages.filter((page): page is TPage & { id: string } => Boolean(page.id) && !page.archived_at);
    if (!normalizedQuery) return visiblePages;

    return visiblePages.filter((page) => getPageName(page.name).toLowerCase().includes(normalizedQuery));
  }, [pages, searchQuery]);

  const handleClose = () => {
    setSearchQuery("");
    setSelectedPageIds(new Set());
    setIsCreateConfirmOpen(false);
    onClose();
  };

  const togglePage = (pageId: string) => {
    setSelectedPageIds((currentPageIds) => {
      const temp = new Set(currentPageIds);
      if (temp.has(pageId)) {
        temp.delete(pageId);
      } else {
        temp.add(pageId);
      }
      return temp;
    });
  };

  const createAndLinkNewPage = async (basePageIds: string[]) => {
    if (!issueIdentifier) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("error"),
        message: "Work item identifier unavailable. Please refresh and try again.",
      });
      return;
    }

    setIsCreatingPage(true);
    try {
      const createdPage = await projectPageService.create(workspaceSlug, projectId, {
        access: EPageAccess.PUBLIC,
        name: `[${issueIdentifier}] - `,
      });

      if (!createdPage.id) throw new Error("Created page missing id");

      await mutatePages([...pages, createdPage], {
        revalidate: false,
      });

      const updatedPageIds = Array.from(new Set([...basePageIds, createdPage.id]));
      const updatedLinks = await replacePageLinks(workspaceSlug, projectId, issueId, updatedPageIds);
      await mutateLinkedPages(updatedLinks, {
        revalidate: false,
      });

      handleClose();
      router.push(`/${workspaceSlug}/projects/${projectId}/pages/${createdPage.id}`);
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("error"),
        message: "Page could not be created and linked. Please try again.",
      });
    } finally {
      setIsCreatingPage(false);
      setIsCreateConfirmOpen(false);
    }
  };

  const handleCreateNewPage = () => {
    if (hasUnsavedChanges) {
      setIsCreateConfirmOpen(true);
      return;
    }

    createAndLinkNewPage(linkedPageIds);
  };

  const handleDiscardAndCreateNewPage = () => createAndLinkNewPage(linkedPageIds);

  const handleSaveAndCreateNewPage = async () => {
    setIsSubmitting(true);
    try {
      const selectedPageIdList = Array.from(selectedPageIds);
      const updatedLinks = await replacePageLinks(workspaceSlug, projectId, issueId, selectedPageIdList);
      await mutateLinkedPages(updatedLinks, {
        revalidate: false,
      });
      await createAndLinkNewPage(selectedPageIdList);
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("error"),
        message: t("issue.link_pages.update_failed"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const updatedLinks = await replacePageLinks(workspaceSlug, projectId, issueId, Array.from(selectedPageIds));
      await mutateLinkedPages(updatedLinks, {
        revalidate: false,
      });
      handleClose();
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("error"),
        message: t("issue.link_pages.update_failed"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.CENTER} width={EModalWidth.SM}>
        <div className="flex flex-col gap-4 py-4 *:px-4">
          <h3 className="text-20 font-semibold text-primary">{t("issue.link_pages.title")}</h3>

          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-6 size-3.5 -translate-y-1/2 text-placeholder" />
            <Input
              className="h-8 w-full pl-8 text-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("issue.link_pages.search_placeholder")}
              disabled={isLoading}
            />
          </div>

          <div className="vertical-scrollbar scrollbar-md max-h-80 overflow-y-auto px-2!">
            {isLoading ? (
              <Loader className="space-y-3">
                <Loader.Item height="40px" />
                <Loader.Item height="40px" />
                <Loader.Item height="40px" />
              </Loader>
            ) : filteredPages.length === 0 ? (
              <div className="rounded-md border border-subtle bg-layer-1 p-4 text-center text-13 text-secondary">
                {t("issue.link_pages.no_pages")}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredPages.map((page) => {
                  const pageName = getPageName(page.name);
                  const selected = selectedPageIds.has(page.id);

                  return (
                    <label
                      key={page.id}
                      htmlFor={`link-page-${page.id}`}
                      className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-layer-1"
                    >
                      <Checkbox
                        id={`link-page-${page.id}`}
                        checked={selected}
                        onChange={() => togglePage(page.id)}
                        disabled={disabled || isSubmitting}
                      />
                      <span className="min-w-0 flex-1 truncate text-13 text-primary">{pageName}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {canCurrentUserCreatePage && (
            <div>
              <Button
                size="sm"
                variant="accent-primary"
                onClick={handleCreateNewPage}
                loading={isCreatingPage}
                disabled={isNewPageButtonDisabled}
              >
                <span className="flex items-center gap-1.5">
                  <PlusIcon className="size-3.5" />
                  New Page
                </span>
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-subtle pt-4">
            <p className="text-12 text-secondary">
              {t("issue.link_pages.selected_count", {
                count: selectedPageIds.size,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="neutral-primary" onClick={handleClose}>
                {t("cancel")}
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSave}
                loading={isSubmitting}
                disabled={disabled || isLoading || isSubmitting}
              >
                {t("confirm")}
              </Button>
            </div>
          </div>
        </div>
      </ModalCore>
      <UnsavedPageLinksModal
        isOpen={isCreateConfirmOpen}
        isSubmitting={isSubmitting}
        isCreatingPage={isCreatingPage}
        onClose={() => setIsCreateConfirmOpen(false)}
        onDiscard={handleDiscardAndCreateNewPage}
        onSave={handleSaveAndCreateNewPage}
      />
    </>
  );
});

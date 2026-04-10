/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react";
import useSWR from "swr";
import { useTranslation } from "@plane/i18n";
import { SearchIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
// plane imports
import type { TIssueServiceType, TPage, TWorkItemPageLink } from "@plane/types";
import { Button, Checkbox, EModalPosition, EModalWidth, Input, Loader, ModalCore } from "@plane/ui";
import { getPageName } from "@plane/utils";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// services
import { ProjectPageService } from "@/services/page";
import { WorkItemPageLinkService } from "@plane/services";

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

export const WorkItemPageLinksModal = observer(function WorkItemPageLinksModal(props: Props) {
  const { workspaceSlug, projectId, issueId, disabled, isOpen, onClose, issueServiceType } = props;
  const { t } = useTranslation();
  const {
    pageLink: { replacePageLinks },
  } = useIssueDetail(issueServiceType);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (!isOpen) {
      setSelectedPageIds((currentPageIds) => (currentPageIds.size === 0 ? currentPageIds : new Set()));
      return;
    }

    const nextPageIds = new Set(linkedPages.map((link) => link.page));
    setSelectedPageIds((currentPageIds) => {
      if (
        currentPageIds.size === nextPageIds.size &&
        Array.from(currentPageIds).every((pageId) => nextPageIds.has(pageId))
      ) {
        return currentPageIds;
      }

      return nextPageIds;
    });
  }, [isOpen, linkedPages]);

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
  );
});

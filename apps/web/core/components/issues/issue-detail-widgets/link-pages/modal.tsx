/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react";
import { useTranslation } from "@plane/i18n";
import { SearchIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
// plane imports
import type { TIssueServiceType, TPage } from "@plane/types";
import { Button, Checkbox, EModalPosition, EModalWidth, Input, Loader, ModalCore } from "@plane/ui";
import { getPageName } from "@plane/utils";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// services
import { ProjectPageService } from "@/services/page";

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

export const WorkItemPageLinksModal = observer(function WorkItemPageLinksModal(props: Props) {
  const { workspaceSlug, projectId, issueId, disabled, isOpen, onClose, issueServiceType } = props;
  const { t } = useTranslation();
  const {
    pageLink: { fetchPageLinks, getLinksByIssueId, getLinkById, replacePageLinks },
  } = useIssueDetail(issueServiceType);
  const [pages, setPages] = useState<TPage[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const linkedPageIds = getLinksByIssueId(issueId);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    Promise.all([
      projectPageService.fetchAll(workspaceSlug, projectId),
      fetchPageLinks(workspaceSlug, projectId, issueId),
    ])
      .then(([projectPages, linkedPages]) => {
        setPages(projectPages);
        setSelectedPageIds(linkedPages.map((link) => link.page));
        return linkedPages;
      })
      .catch(() => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: t("error"),
          message: t("issue.link_pages.load_failed"),
        });
      })
      .finally(() => setIsLoading(false));
  }, [fetchPageLinks, isOpen, issueId, projectId, t, workspaceSlug]);

  useEffect(() => {
    if (!isOpen || !linkedPageIds) return;
    setSelectedPageIds(
      linkedPageIds.map((linkId) => getLinkById(linkId)?.page).filter((pageId): pageId is string => Boolean(pageId))
    );
  }, [getLinkById, isOpen, linkedPageIds]);

  const filteredPages = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const visiblePages = pages.filter((page): page is TPage & { id: string } => Boolean(page.id) && !page.archived_at);
    if (!normalizedQuery) return visiblePages;

    return visiblePages.filter((page) => getPageName(page.name).toLowerCase().includes(normalizedQuery));
  }, [pages, searchQuery]);

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  const togglePage = (pageId: string) => {
    setSelectedPageIds((currentPageIds) =>
      currentPageIds.includes(pageId)
        ? currentPageIds.filter((currentPageId) => currentPageId !== pageId)
        : [...currentPageIds, pageId]
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await replacePageLinks(workspaceSlug, projectId, issueId, selectedPageIds);
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
    <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.CENTER} width={EModalWidth.XXL}>
      <div className="flex flex-col">
        <div className="border-b border-subtle p-4">
          <h3 className="text-lg font-medium text-primary">{t("issue.link_pages.title")}</h3>
          <p className="mt-1 text-13 text-secondary">{t("issue.link_pages.description")}</p>
        </div>

        <div className="p-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-tertiary" />
            <Input
              className="w-full pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("issue.link_pages.search_placeholder")}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="vertical-scrollbar scrollbar-md max-h-80 overflow-y-auto px-4 pb-4">
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
                const selected = selectedPageIds.includes(page.id);

                return (
                  <label
                    key={page.id}
                    htmlFor={`link-page-${page.id}`}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-layer-1"
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

        <div className="flex items-center justify-between border-t border-subtle p-4">
          <p className="text-12 text-secondary">
            {t("issue.link_pages.selected_count", { count: selectedPageIds.length })}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="neutral-primary" size="lg" onClick={handleClose}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleSave}
              loading={isSubmitting}
              disabled={disabled || isLoading || isSubmitting}
            >
              {t("save")}
            </Button>
          </div>
        </div>
      </div>
    </ModalCore>
  );
});

/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo, useState } from "react";
import { observer } from "mobx-react";
import { v4 as uuidv4 } from "uuid";
// plane imports
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import type { TIssue } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
// components
import { ProjectDropdown } from "@/components/dropdowns/project/dropdown";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useAppRouter } from "@/hooks/use-app-router";
import { useUser } from "@/hooks/store/user";

type TDuplicateWorkItemModalProps = {
  issue: TIssue;
  onClose: () => void;
  isOpen: boolean;
  workspaceSlug: string;
  projectId: string;
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

export const DuplicateWorkItemModal = observer(function DuplicateWorkItemModal(props: TDuplicateWorkItemModalProps) {
  const { issue, onClose, isOpen, workspaceSlug, projectId } = props;
  // states
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  // hooks
  const { t } = useTranslation();
  const router = useAppRouter();
  const { projectsWithCreatePermissions } = useUser();
  const { toggleCreateIssueModal } = useCommandPalette();
  const { fetchIssue } = useIssueDetail();

  const projectsWithCreatePermission = useMemo(
    () => new Set(Object.keys(projectsWithCreatePermissions ?? {})),
    [projectsWithCreatePermissions]
  );

  const handleClose = () => {
    setSelectedProjectId(null);
    onClose();
  };

  const handleContinue = async () => {
    if (!selectedProjectId) return;

    const sourceIssue =
      (await fetchIssue(workspaceSlug.toString(), projectId, issue.id).catch(() => undefined)) ?? issue;

    toggleCreateIssueModal(true, EIssuesStoreType.PROJECT, [selectedProjectId], {
      name: sourceIssue.name,
      description_html: prepareDescriptionForCrossProjectCopy(sourceIssue.description_html),
      priority: sourceIssue.priority,
      start_date: sourceIssue.start_date,
      target_date: sourceIssue.target_date,
      project_id: selectedProjectId,
    });

    router.push(`/${workspaceSlug}/projects/${selectedProjectId}/issues`);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.TOP} width={EModalWidth.XXL}>
      <div className="space-y-4 p-5">
        <div>
          <h5 className="text-lg font-medium text-primary">{t("common.actions.copy_in_different_project")}</h5>
          <p className="text-sm text-secondary">{t("project")}</p>
        </div>

        <div className="h-7">
          <ProjectDropdown
            multiple={false}
            value={selectedProjectId}
            onChange={(value) => setSelectedProjectId(value)}
            buttonVariant="border-with-text"
            renderCondition={(targetProjectId) =>
              targetProjectId !== projectId && projectsWithCreatePermission.has(targetProjectId)
            }
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-subtle pt-4">
          <Button variant="secondary" size="base" onClick={handleClose}>
            {t("cancel")}
          </Button>
          <Button variant="primary" size="base" onClick={handleContinue} disabled={!selectedProjectId}>
            {t("confirm")}
          </Button>
        </div>
      </div>
    </ModalCore>
  );
});

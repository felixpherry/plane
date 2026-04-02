/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { isEmpty } from "lodash-es";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// Plane imports
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TIssue } from "@plane/types";
import { CustomFieldService } from "@plane/services";
import { isEmptyHtmlString } from "@plane/utils";
// hooks
import { useIssueModal } from "@/hooks/context/use-issue-modal";
import { useWorkspaceDraftIssues } from "@/hooks/store/workspace-draft";
import { persistCustomFieldValues } from "./custom-field-values";
// local imports
import { ConfirmIssueDiscard } from "../confirm-issue-discard";
import { IssueFormRoot } from "./form";
import type { IssueFormProps } from "./form";

const customFieldService = new CustomFieldService();

export interface DraftIssueProps extends IssueFormProps {
  changesMade: Partial<TIssue> | null;
  onChange: (formData: Partial<TIssue> | null) => void;
}

export const DraftIssueLayout = observer(function DraftIssueLayout(props: DraftIssueProps) {
  const { changesMade, data, onChange, onClose, projectId, customFields = [], customFieldValues = {} } = props;
  // states
  const [issueDiscardModal, setIssueDiscardModal] = useState(false);
  // router params
  const { workspaceSlug } = useParams();
  // store hooks
  const { handleCreateUpdatePropertyValues } = useIssueModal();
  const { createIssue } = useWorkspaceDraftIssues();
  const { t } = useTranslation();
  const hasCustomFieldValues = Object.keys(customFieldValues).length > 0;

  const sanitizeChanges = (): Partial<TIssue> => {
    const sanitizedChanges = { ...changesMade };
    Object.entries(sanitizedChanges).forEach(([key, value]) => {
      const issueKey = key as keyof TIssue;
      if (value === null || value === undefined || value === "") delete sanitizedChanges[issueKey];
      if (typeof value === "object" && isEmpty(value)) delete sanitizedChanges[issueKey];
      if (Array.isArray(value) && value.length === 0) delete sanitizedChanges[issueKey];
      if (issueKey === "project_id") delete sanitizedChanges.project_id;
      if (issueKey === "priority" && value && value === "none") delete sanitizedChanges.priority;
      if (
        issueKey === "description_html" &&
        changesMade?.description_html &&
        isEmptyHtmlString(changesMade.description_html, ["img"])
      )
        delete sanitizedChanges.description_html;
    });
    return sanitizedChanges;
  };

  const handleClose = () => {
    const hasDraftChanges = changesMade ? !isEmpty(sanitizeChanges()) : false;

    // If the user is updating an existing work item, we don't need to show the discard modal
    if (data?.id) {
      onClose();
      setIssueDiscardModal(false);
    } else {
      if (hasDraftChanges || hasCustomFieldValues) {
        const sanitizedChanges = sanitizeChanges();
        if (isEmpty(sanitizedChanges) && !hasCustomFieldValues) {
          onClose();
          setIssueDiscardModal(false);
        } else setIssueDiscardModal(true);
      } else {
        onClose();
        setIssueDiscardModal(false);
      }
    }
  };

  const handleCreateDraftIssue = async () => {
    if ((!changesMade && !hasCustomFieldValues) || !workspaceSlug || !projectId) return;

    const payload = {
      ...changesMade,
      name: changesMade?.name && changesMade?.name?.trim() !== "" ? changesMade.name?.trim() : "Untitled",
      project_id: projectId,
    };

    const response = await createIssue(workspaceSlug.toString(), payload)
      .then((res) => {
        return res;
      })
      .catch((_error) => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: `${t("error")}!`,
          message: t("workspace_draft_issues.toasts.created.error"),
        });
      });

    if (response && handleCreateUpdatePropertyValues) {
      try {
        await handleCreateUpdatePropertyValues({
          issueId: response.id,
          issueTypeId: response.type_id,
          projectId,
          workspaceSlug: workspaceSlug?.toString(),
          isDraft: true,
        });

        const customFieldSaveResult = await persistCustomFieldValues({
          customFieldService,
          workspaceSlug: workspaceSlug.toString(),
          projectId,
          issueId: response.id,
          customFields,
          customFieldValues,
        });

        setToast({
          type: customFieldSaveResult.hasErrors ? TOAST_TYPE.ERROR : TOAST_TYPE.SUCCESS,
          title: customFieldSaveResult.hasErrors ? `${t("error")}!` : `${t("success")}!`,
          message: customFieldSaveResult.hasErrors
            ? "Draft issue was created, but some custom field values failed to save."
            : t("workspace_draft_issues.toasts.created.success"),
        });
      } catch {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: `${t("error")}!`,
          message: "Draft issue was created, but some values failed to save.",
        });
      } finally {
        onChange(null);
        setIssueDiscardModal(false);
        onClose();
      }
    }
  };

  const handleDraftAndClose = () => {
    const sanitizedChanges = sanitizeChanges();
    if (!data?.id && (!isEmpty(sanitizedChanges) || hasCustomFieldValues)) {
      handleCreateDraftIssue();
    }
    onClose();
  };

  return (
    <>
      <ConfirmIssueDiscard
        isOpen={issueDiscardModal}
        handleClose={() => setIssueDiscardModal(false)}
        onConfirm={handleCreateDraftIssue}
        onDiscard={() => {
          onChange(null);
          setIssueDiscardModal(false);
          onClose();
        }}
      />
      <IssueFormRoot {...props} onClose={handleClose} handleDraftAndClose={handleDraftAndClose} />
    </>
  );
});

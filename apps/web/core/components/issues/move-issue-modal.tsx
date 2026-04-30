// eslint-disable
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TIssue } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import { AlertModalCore } from "@plane/ui";
import { generateWorkItemLink } from "@plane/utils";
// hooks
import { useIssuesActions } from "@/hooks/use-issues-actions";
import { useProject } from "@/hooks/store/use-project";
import { useAppRouter } from "@/hooks/use-app-router";

type TMoveIssueProject = {
  id: string;
  name: string;
};

type TMoveIssueResponse = TIssue & {
  project_identifier?: string;
};

type Props = {
  data: TIssue;
  isOpen: boolean;
  handleClose: () => void;
  targetProject?: TMoveIssueProject;
  storeType?: EIssuesStoreType;
};

export const MoveIssueModal = observer(function MoveIssueModal(props: Props) {
  const { data, isOpen, handleClose, targetProject, storeType = EIssuesStoreType.PROJECT } = props;
  const [isMoving, setIsMoving] = useState(false);
  const { workspaceSlug } = useParams();
  const router = useAppRouter();
  const { moveIssue } = useIssuesActions(storeType);
  const { getProjectIdentifierById } = useProject();

  useEffect(() => {
    setIsMoving(false);
  }, [isOpen]);

  if (!targetProject) return null;

  const sourceProjectIdentifier = getProjectIdentifierById(data.project_id ?? undefined);
  const targetProjectIdentifier = getProjectIdentifierById(targetProject.id);

  const onClose = () => {
    setIsMoving(false);
    handleClose();
  };

  const handleMoveIssue = async () => {
    if (!workspaceSlug || !data.project_id || !moveIssue) return;

    setIsMoving(true);
    await moveIssue(data.project_id, data.id, targetProject.id)
      .then((movedIssueResponse) => {
        const movedIssue = movedIssueResponse as TMoveIssueResponse | undefined;
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Work item moved",
          message: `Moved work item to ${targetProject.name}.`,
        });
        onClose();

        if (!movedIssue) return;

        const workItemLink = generateWorkItemLink({
          workspaceSlug: workspaceSlug.toString(),
          projectId: movedIssue.project_id,
          issueId: movedIssue.id,
          projectIdentifier: movedIssue.project_identifier ?? targetProjectIdentifier,
          sequenceId: movedIssue.sequence_id,
        });
        router.push(workItemLink);
      })
      .catch((error) => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Move failed",
          message: error?.error ?? "Work item could not be moved. Please try again.",
        });
      })
      .finally(() => setIsMoving(false));
  };

  return (
    <AlertModalCore
      handleClose={onClose}
      handleSubmit={handleMoveIssue}
      isSubmitting={isMoving}
      isOpen={isOpen}
      title="Move work item to different project?"
      variant="primary"
      primaryButtonText={{ loading: "Moving", default: "Move work item" }}
      content={
        <>
          Work item{" "}
          <span className="font-medium break-words text-primary">
            {sourceProjectIdentifier}-{data.sequence_id}
          </span>{" "}
          will move to <span className="font-medium break-words text-primary">{targetProject.name}</span>.
          Project-specific properties will be reset: state, priority, assignees, labels, dates, estimate, parent, cycle,
          module, subscribers, mentions, custom fields, page links, and relations. Title, description, comments,
          attachments, links, worklogs, reactions, votes, and history will be preserved.
        </>
      }
    />
  );
});

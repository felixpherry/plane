/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// plane imports
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
// components
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { PageHead } from "@/components/core/page-title";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { SettingsHeading } from "@/components/settings/heading";
import { CustomFieldSettings } from "@/components/settings/project/content/custom-fields";
// hooks
import { useProject } from "@/hooks/store/use-project";
import { useUserPermissions } from "@/hooks/store/user";
// local imports
import type { Route } from "./+types/page";
import { FeaturesCustomFieldsProjectSettingsHeader } from "./header";

function FeaturesCustomFieldsSettingsPage({ params }: Route.ComponentProps) {
  const { workspaceSlug, projectId } = params;
  // store hooks
  const { workspaceUserInfo, allowPermissions } = useUserPermissions();
  const { currentProjectDetails } = useProject();
  // derived values
  const pageTitle = currentProjectDetails?.name
    ? `${currentProjectDetails?.name} settings - Custom Fields`
    : undefined;
  const canPerformProjectAdminActions = allowPermissions(
    [EUserPermissions.ADMIN],
    EUserPermissionsLevel.PROJECT
  );

  if (workspaceUserInfo && !canPerformProjectAdminActions) {
    return (
      <NotAuthorizedView
        section="settings"
        isProjectView
        className="h-auto"
      />
    );
  }

  return (
    <SettingsContentWrapper
      header={<FeaturesCustomFieldsProjectSettingsHeader />}
    >
      <PageHead title={pageTitle} />
      <section className="w-full">
        <SettingsHeading
          title="Custom Fields"
          description="Define custom properties for work items in this project. Fields you create here will appear in the work item detail sidebar."
        />
        <div className="mt-7">
          <CustomFieldSettings
            workspaceSlug={workspaceSlug}
            projectId={projectId}
          />
        </div>
      </section>
    </SettingsContentWrapper>
  );
}

export default observer(FeaturesCustomFieldsSettingsPage);

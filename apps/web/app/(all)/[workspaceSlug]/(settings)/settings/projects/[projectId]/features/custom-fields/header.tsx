/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// plane imports
import { PROJECT_SETTINGS } from "@plane/constants";
import { Breadcrumbs } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { SettingsPageHeader } from "@/components/settings/page-header";
import { PROJECT_SETTINGS_ICONS } from "@/components/settings/project/sidebar/item-icon";

export const FeaturesCustomFieldsProjectSettingsHeader = observer(
  function FeaturesCustomFieldsProjectSettingsHeader() {
    // derived values
    const settingsDetails = PROJECT_SETTINGS.features_custom_fields;
    const Icon = PROJECT_SETTINGS_ICONS.features_custom_fields;

    return (
      <SettingsPageHeader
        leftItem={
          <div className="flex items-center gap-2">
            <Breadcrumbs>
              <Breadcrumbs.Item
                component={
                  <BreadcrumbLink
                    label="Custom Fields"
                    icon={<Icon className="size-4 text-tertiary" />}
                  />
                }
              />
            </Breadcrumbs>
          </div>
        }
      />
    );
  }
);

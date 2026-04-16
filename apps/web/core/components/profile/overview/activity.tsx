/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
// ui
import { useTranslation } from "@plane/i18n";
import { EmptyStateCompact } from "@plane/propel/empty-state";
import { Loader, Card } from "@plane/ui";
// constants
import { USER_PROFILE_ACTIVITY } from "@/constants/fetch-keys";
import { UserActivityPreviewList } from "@/components/profile/activity/activity-items";
// helpers
// hooks
import { useUser } from "@/hooks/store/user";
// services
import { UserService } from "@/services/user.service";

const userService = new UserService();

export const ProfileActivity = observer(function ProfileActivity() {
  const { workspaceSlug, userId } = useParams();
  // store hooks
  const { data: currentUser } = useUser();
  const { t } = useTranslation();

  const { data: userProfileActivity } = useSWR(
    workspaceSlug && userId ? USER_PROFILE_ACTIVITY(workspaceSlug.toString(), userId.toString(), {}) : null,
    workspaceSlug && userId
      ? () =>
          userService.getUserProfileActivity(workspaceSlug.toString(), userId.toString(), {
            per_page: 10,
          })
      : null
  );

  return (
    <div className="space-y-2">
      <h3 className="text-16 font-medium">{t("profile.stats.recent_activity.title")}</h3>
      <Card>
        {userProfileActivity ? (
          userProfileActivity.results.length > 0 ? (
            <UserActivityPreviewList activity={userProfileActivity} currentUserId={currentUser?.id} />
          ) : (
            <EmptyStateCompact title={t("no_data_yet")} assetKey="unknown" assetClassName="size-20" />
          )
        ) : (
          <Loader className="space-y-5">
            <Loader.Item height="40px" />
            <Loader.Item height="40px" />
            <Loader.Item height="40px" />
            <Loader.Item height="40px" />
            <Loader.Item height="40px" />
          </Loader>
        )}
      </Card>
    </div>
  );
});

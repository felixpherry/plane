/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// plane imports
import type { IUserActivityResponse } from "@plane/types";
// components
import { ActivitySettingsLoader } from "@/components/ui/loader/settings/activity";
import { UserActivityResultsList } from "./activity-items";
// hooks
import { useUser } from "@/hooks/store/user";

type Props = {
  activity: IUserActivityResponse | undefined;
};

export const ActivityList = observer(function ActivityList(props: Props) {
  const { activity } = props;
  // store hooks
  const { data: currentUser } = useUser();
  return (
    <>
      {activity ? (
        <UserActivityResultsList activity={activity} currentUserId={currentUser?.id} />
      ) : (
        <ActivitySettingsLoader />
      )}
    </>
  );
});

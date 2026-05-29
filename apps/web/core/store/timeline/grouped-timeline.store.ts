/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { action, autorun, makeObservable, observable } from "mobx";
import type { RootStore } from "@/plane-web/store/root.store";
import type { IBaseTimelineStore } from "@/plane-web/store/timeline/base-timeline.store";
import { BaseTimeLineStore } from "@/plane-web/store/timeline/base-timeline.store";

type TGroupedTimelineBlockData = {
  id: string;
  name: string;
  sort_order: number | null;
  start_date?: string | null;
  target_date?: string | null;
  project_id?: string | null;
};

export interface IGroupedTimeLineStore extends IBaseTimelineStore {
  setGroupedBlockDataMap: (data: Record<string, TGroupedTimelineBlockData>) => void;
}

export class GroupedTimeLineStore extends BaseTimeLineStore implements IGroupedTimeLineStore {
  groupedBlockDataMap: Record<string, TGroupedTimelineBlockData> = {};

  constructor(rootStore: RootStore) {
    super(rootStore);

    makeObservable(this, {
      groupedBlockDataMap: observable,
      setGroupedBlockDataMap: action.bound,
    });

    autorun(() => {
      this.updateBlocks((blockId) => this.groupedBlockDataMap[blockId]);
    });
  }

  setGroupedBlockDataMap(data: Record<string, TGroupedTimelineBlockData>) {
    this.groupedBlockDataMap = data;
  }
}

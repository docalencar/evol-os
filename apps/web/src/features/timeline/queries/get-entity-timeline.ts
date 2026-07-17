import "server-only"

import {
  getActivityTimeline,
} from "./get-activity-timeline"
import type {
  GetEntityTimelineInput,
} from "../types/entity-timeline"
import type {
  ActivityTimelineViewModel,
} from "../view-models/activity-timeline-item-view-model"

export async function getEntityTimeline(
  input: GetEntityTimelineInput
): Promise<ActivityTimelineViewModel> {
  return getActivityTimeline(input)
}

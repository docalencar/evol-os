import "server-only"

import {
  getActivityTimeline,
} from "./get-activity-timeline"
import type {
  GetCompanyTimelineInput,
} from "../types/company-timeline"
import type {
  ActivityTimelineViewModel,
} from "../view-models/activity-timeline-item-view-model"

export async function getCompanyTimeline(
  input: GetCompanyTimelineInput
): Promise<ActivityTimelineViewModel> {
  return getActivityTimeline(input)
}

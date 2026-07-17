import "server-only"

import {
  presentActivityTimeline,
} from "../presenters/activity-timeline-presenter"
import type {
  ActivityTimelineRecord,
} from "../presenters/activity-timeline-presenter"
import {
  createActivityTimelineRepository,
} from "../repositories/activity-timeline-repository"
import type {
  ActivityTimelineFilters,
} from "../types/activity-timeline"
import type {
  ActivityTimelineViewModel,
} from "../view-models/activity-timeline-item-view-model"

export async function getActivityTimeline(
  input: ActivityTimelineFilters
): Promise<ActivityTimelineViewModel> {
  const repository =
    await createActivityTimelineRepository()

  const limit = Math.min(
    Math.max(input.limit ?? 25, 1),
    100
  )

  const { data, error } =
    await repository.list({
      ...input,
      limit: limit + 1,
    })

  if (error) {
    throw new Error(
      `Não foi possível carregar a timeline: ${error.message}`
    )
  }

  return presentActivityTimeline(
    (data ?? []) as ActivityTimelineRecord[],
    limit
  )
}

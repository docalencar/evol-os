import type {
  ActivityActorType,
  ActivityMetadata,
  ActivityVisibility,
} from "@/features/activity"

import type {
  ActivityTimelineViewModel,
  ActivityTimelineItemViewModel,
} from "../view-models/activity-timeline-item-view-model"

export type ActivityTimelineRecord = {
  id: string
  company_id: string
  activity_type: string
  module: string
  title: string
  description: string | null
  actor_type: string
  actor_id: string | null
  entity_type: string | null
  entity_id: string | null
  subject_type: string | null
  subject_id: string | null
  visibility: string
  metadata: unknown
  occurred_at: string
  created_at: string
}

export function presentActivityTimelineItem(
  activity: ActivityTimelineRecord
): ActivityTimelineItemViewModel {
  return {
    id: activity.id,
    companyId: activity.company_id,
    activityType: activity.activity_type,
    module: activity.module,
    title: activity.title,
    description: activity.description,
    actorType:
      activity.actor_type as ActivityActorType,
    actorId: activity.actor_id,
    entityType: activity.entity_type,
    entityId: activity.entity_id,
    subjectType: activity.subject_type,
    subjectId: activity.subject_id,
    visibility:
      activity.visibility as ActivityVisibility,
    metadata:
      (activity.metadata ?? {}) as ActivityMetadata,
    occurredAt: activity.occurred_at,
    createdAt: activity.created_at,
  }
}

export function presentActivityTimeline(
  activities: ActivityTimelineRecord[],
  requestedLimit: number
): ActivityTimelineViewModel {
  const hasMore =
    activities.length > requestedLimit

  const visibleActivities = hasMore
    ? activities.slice(0, requestedLimit)
    : activities

  const items = visibleActivities.map(
    presentActivityTimelineItem
  )

  return {
    items,
    hasMore,
    nextCursor:
      hasMore && items.length > 0
        ? items[items.length - 1].occurredAt
        : null,
  }
}

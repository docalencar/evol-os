import type {
  ActivityActorType,
  ActivityMetadata,
  ActivityVisibility,
} from "../types/activity"
import type {
  ActivityViewModel,
} from "../view-models/activity-view-model"

export type ActivityRecord = {
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

export function presentActivity(
  activity: ActivityRecord
): ActivityViewModel {
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

export function presentActivities(
  activities: ActivityRecord[]
): ActivityViewModel[] {
  return activities.map(presentActivity)
}

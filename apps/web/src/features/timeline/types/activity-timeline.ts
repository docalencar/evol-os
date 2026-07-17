import type {
  ActivityActorType,
  ActivityMetadata,
  ActivityVisibility,
} from "@/features/activity"

export type ActivityTimelineFilters = {
  companyId: string
  actorType?: ActivityActorType
  actorId?: string
  module?: string
  activityType?: string
  entityType?: string
  entityId?: string
  subjectType?: string
  subjectId?: string
  visibility?: ActivityVisibility
  from?: Date
  to?: Date
  cursor?: string
  limit?: number
}

export type ActivityTimelineItem = {
  id: string
  companyId: string
  activityType: string
  module: string
  title: string
  description: string | null
  actorType: ActivityActorType
  actorId: string | null
  entityType: string | null
  entityId: string | null
  subjectType: string | null
  subjectId: string | null
  visibility: ActivityVisibility
  metadata: ActivityMetadata
  occurredAt: Date
  createdAt: Date
}

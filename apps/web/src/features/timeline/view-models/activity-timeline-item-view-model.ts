import type {
  ActivityActorType,
  ActivityMetadata,
  ActivityVisibility,
} from "@/features/activity"

export type ActivityTimelineItemViewModel = {
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
  occurredAt: string
  createdAt: string
}

export type ActivityTimelineViewModel = {
  items: ActivityTimelineItemViewModel[]
  nextCursor: string | null
  hasMore: boolean
}

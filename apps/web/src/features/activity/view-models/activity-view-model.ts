import type {
  ActivityActorType,
  ActivityMetadata,
  ActivityVisibility,
} from "../types/activity"

export type ActivityViewModel = {
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

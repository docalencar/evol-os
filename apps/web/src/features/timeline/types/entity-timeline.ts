import type {
  ActivityActorType,
  ActivityVisibility,
} from "@/features/activity"

export type GetEntityTimelineInput = {
  companyId: string
  entityType: string
  entityId: string
  actorType?: ActivityActorType
  actorId?: string
  module?: string
  activityType?: string
  visibility?: ActivityVisibility
  from?: Date
  to?: Date
  cursor?: string
  limit?: number
}

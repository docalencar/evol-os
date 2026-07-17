import type {
  ActivityActorType,
  ActivityVisibility,
} from "@/features/activity"

export type GetCompanyTimelineInput = {
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

import type {
  ActivityActorType,
  ActivityVisibility,
} from "@/features/activity"

export type GetEmployeeTimelineInput = {
  companyId: string
  employeeId: string
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

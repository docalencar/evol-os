import type {
  OrganizationExecutionError,
} from "../types/organization-execution-report"

export type ApplyOrganizationSyncPlanActionResult = {
  success: boolean
  message: string
  totalItems: number
  appliedItems: number
  skippedItems: number
  failedItems: number
  errors: OrganizationExecutionError[]
}

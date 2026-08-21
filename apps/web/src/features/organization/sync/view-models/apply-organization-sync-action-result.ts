import type {
  OrganizationExecutionError,
} from "../types/organization-execution-report"

// Applied-count breakdown per organization entity, derived from the trusted
// execution report's entity summary (presentation-only; no extra DB read).
export type ApplyOrganizationSyncAppliedByEntity = {
  department: number
  team: number
  position: number
  employee: number
}

export type ApplyOrganizationSyncPlanActionResult = {
  success: boolean
  message: string
  totalItems: number
  appliedItems: number
  skippedItems: number
  failedItems: number
  appliedByEntity: ApplyOrganizationSyncAppliedByEntity
  errors: OrganizationExecutionError[]
}

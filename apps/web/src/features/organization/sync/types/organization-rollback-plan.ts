import type {
  OrganizationEntity,
} from "./organization-entity"
import type {
  OrganizationSyncOperation,
} from "./organization-sync-operation"

export type OrganizationRollbackOperation =
  | "archive"
  | "restore"
  | "update"
  | "move"

export type OrganizationRollbackItemStatus =
  | "ready"
  | "unsupported"

export type OrganizationRollbackItem = {
  receiptItemId: string
  entityId: string
  entity: OrganizationEntity
  sourceOperation: OrganizationSyncOperation
  rollbackOperation: OrganizationRollbackOperation | null
  status: OrganizationRollbackItemStatus
  message: string | null
}

export type OrganizationRollbackPlan = {
  generatedAt: Date
  executionStartedAt: Date
  executionFinishedAt: Date
  canRollback: boolean
  totalItems: number
  readyItems: number
  unsupportedItems: number
  items: OrganizationRollbackItem[]
}

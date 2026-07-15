import type { OrganizationEntity } from "./organization-entity"
import type { OrganizationSyncOperation } from "./organization-sync-operation"

export type OrganizationExecutionItemSummary = {
  appliedItems: number
  skippedItems: number
  failedItems: number
}

export type OrganizationExecutionEntitySummary = Record<
  OrganizationEntity,
  OrganizationExecutionItemSummary
>

export type OrganizationExecutionOperationSummary = Record<
  OrganizationSyncOperation,
  OrganizationExecutionItemSummary
>

export type OrganizationExecutionWarning = {
  itemId: string
  entity: OrganizationEntity
  operation: OrganizationSyncOperation
  message: string
}

export type OrganizationExecutionError = {
  itemId: string
  entity: OrganizationEntity
  operation: OrganizationSyncOperation
  message: string
}

export type OrganizationExecutionReport = {
  startedAt: Date
  finishedAt: Date
  duration: number
  appliedItems: number
  skippedItems: number
  failedItems: number
  entitySummary: OrganizationExecutionEntitySummary
  operationSummary: OrganizationExecutionOperationSummary
  warnings: OrganizationExecutionWarning[]
  errors: OrganizationExecutionError[]
}

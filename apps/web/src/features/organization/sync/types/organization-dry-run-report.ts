import type { OrganizationEntity } from "./organization-entity"
import type { OrganizationSyncOperation } from "./organization-sync-operation"

export type OrganizationDryRunItemSummary = {
  totalItems: number
  applicableItems: number
  skippedItems: number
  blockedItems: number
}

export type OrganizationDryRunEntitySummary = Record<
  OrganizationEntity,
  OrganizationDryRunItemSummary
>

export type OrganizationDryRunOperationSummary = Record<
  OrganizationSyncOperation,
  OrganizationDryRunItemSummary
>

export type OrganizationDryRunWarning = {
  itemId: string
  entity: OrganizationEntity
  operation: OrganizationSyncOperation
  title: string
  message: string
}

export type OrganizationDryRunBlocker = {
  itemId: string
  entity: OrganizationEntity
  operation: OrganizationSyncOperation
  title: string
  message: string
}

export type OrganizationDryRunReport = {
  generatedAt: Date
  planGeneratedAt: Date
  canApply: boolean
  totalItems: number
  applicableItems: number
  skippedItems: number
  blockedItems: number
  entitySummary: OrganizationDryRunEntitySummary
  operationSummary: OrganizationDryRunOperationSummary
  warnings: OrganizationDryRunWarning[]
  blockers: OrganizationDryRunBlocker[]
}

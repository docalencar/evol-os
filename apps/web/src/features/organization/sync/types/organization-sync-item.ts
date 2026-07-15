import type { OrganizationEntity } from "./organization-entity"
import type { OrganizationSyncOperation } from "./organization-sync-operation"
import type { OrganizationSyncSeverity } from "./organization-sync-severity"

export type OrganizationSyncItem = {
  id: string
  entity: OrganizationEntity
  operation: OrganizationSyncOperation
  severity: OrganizationSyncSeverity
  title: string
  description: string
  current: unknown
  desired: unknown
}

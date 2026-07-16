import type { OrganizationEntity } from "./organization-entity"
import type { OrganizationSyncOperation } from "./organization-sync-operation"

export type OrganizationMutationReceipt = {
  itemId: string
  entity: OrganizationEntity
  operation: OrganizationSyncOperation
  entityId: string
}

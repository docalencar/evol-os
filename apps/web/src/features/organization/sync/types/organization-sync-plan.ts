import type { OrganizationSyncItem } from "./organization-sync-item"
import type { OrganizationSyncSummary } from "./organization-sync-summary"

export type OrganizationSyncPlan = {
  generatedAt: Date
  summary: OrganizationSyncSummary
  items: OrganizationSyncItem[]
}

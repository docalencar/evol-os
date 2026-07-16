export type OrganizationSyncHistoryStatus =
  | "success"
  | "with_errors"
  | "no_changes"

export type OrganizationSyncHistoryItemViewModel = {
  id: string
  executedAtLabel: string
  durationLabel: string
  appliedItems: number
  skippedItems: number
  failedItems: number
  status: OrganizationSyncHistoryStatus
  statusLabel: string
  detailsHref: string
}

export type OrganizationSyncHistoryViewModel = {
  totalExecutions: number
  items: OrganizationSyncHistoryItemViewModel[]
}

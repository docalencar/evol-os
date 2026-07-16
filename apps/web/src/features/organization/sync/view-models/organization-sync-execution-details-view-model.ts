export type OrganizationSyncExecutionStatus =
  | "success"
  | "with_errors"
  | "no_changes"

export type OrganizationSyncExecutionMetricViewModel = {
  key: string
  label: string
  value: number | string
  description: string
}

export type OrganizationSyncExecutionSummaryItemViewModel = {
  key: string
  label: string
  appliedItems: number
  skippedItems: number
  failedItems: number
}

export type OrganizationSyncExecutionNoticeViewModel = {
  itemId: string
  entityLabel: string
  operationLabel: string
  message: string
}

export type OrganizationSyncExecutionDetailsViewModel = {
  id: string
  status: OrganizationSyncExecutionStatus
  statusLabel: string
  executedAtLabel: string
  startedAtLabel: string
  finishedAtLabel: string
  durationLabel: string
  metrics: OrganizationSyncExecutionMetricViewModel[]
  entitySummary: OrganizationSyncExecutionSummaryItemViewModel[]
  operationSummary: OrganizationSyncExecutionSummaryItemViewModel[]
  warnings: OrganizationSyncExecutionNoticeViewModel[]
  errors: OrganizationSyncExecutionNoticeViewModel[]
  historyHref: string
}

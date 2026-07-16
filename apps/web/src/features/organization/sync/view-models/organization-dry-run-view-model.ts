export type OrganizationDryRunDecisionTone =
  | "success"
  | "warning"
  | "danger"

export type OrganizationDryRunMetricViewModel = {
  key: string
  label: string
  value: number
}

export type OrganizationDryRunSummaryViewModel = {
  key: string
  label: string
  totalItems: number
  applicableItems: number
  skippedItems: number
  blockedItems: number
}

export type OrganizationDryRunNoticeViewModel = {
  itemId: string
  title: string
  description: string
  entityLabel: string
  operationLabel: string
}

export type OrganizationDryRunViewModel = {
  decision: {
    status: "safe" | "review" | "blocked"
    tone: OrganizationDryRunDecisionTone
    title: string
    description: string
  }
  metrics: OrganizationDryRunMetricViewModel[]
  entitySummary: OrganizationDryRunSummaryViewModel[]
  operationSummary: OrganizationDryRunSummaryViewModel[]
  warnings: OrganizationDryRunNoticeViewModel[]
  blockers: OrganizationDryRunNoticeViewModel[]
  generatedAtLabel: string
}

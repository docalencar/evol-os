export type OrganizationDryRunDecisionTone =
  | "success"
  | "warning"
  | "danger"
  | "neutral"

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
    status: "safe" | "review" | "blocked" | "no-change"
    tone: OrganizationDryRunDecisionTone
    title: string
    description: string
  }
  // True when there are analyzed items but nothing applicable and nothing
  // blocked — the sheet is already synchronized. Presentation-only; derived
  // from the existing report counts, not a new plan/execution state.
  noChange: boolean
  metrics: OrganizationDryRunMetricViewModel[]
  entitySummary: OrganizationDryRunSummaryViewModel[]
  operationSummary: OrganizationDryRunSummaryViewModel[]
  warnings: OrganizationDryRunNoticeViewModel[]
  blockers: OrganizationDryRunNoticeViewModel[]
  generatedAtLabel: string
}

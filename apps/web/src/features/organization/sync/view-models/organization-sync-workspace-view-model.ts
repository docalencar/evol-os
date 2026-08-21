export type OrganizationSyncMetricTone =
  | "neutral"
  | "positive"
  | "warning"
  | "critical"

export type OrganizationSyncMetricViewModel = {
  id:
    | "creates"
    | "updates"
    | "moves"
    | "archives"
    | "unchanged"
    | "conflicts"
  label: string
  value: number
  description: string
  tone: OrganizationSyncMetricTone
}

export type OrganizationSyncWorkspaceViewModel = {
  generatedAtLabel: string
  totalChanges: number
  requiresReview: boolean
  canApply: boolean
  // True when analyzed items exist but nothing is applicable and nothing
  // conflicts — the sheet is already synchronized. Presentation-only.
  noChange: boolean
  // Business-outcome, future-tense summary of what will be applied, per entity
  // (e.g. "3 colaboradores serão adicionados"). Non-zero entities only. This is
  // the PRIMARY explanation — not the aggregate per-operation plan-item counts.
  plannedChanges: string[]
  // Honest framing for pre-existing entities the plan recognized as unchanged.
  // Present only when there are unchanged items. Never an "ignored" count.
  alreadyRecognizedMessage: string | null
  // Aggregate per-operation counts, retained for detail/audit — not primary.
  metrics: OrganizationSyncMetricViewModel[]
}

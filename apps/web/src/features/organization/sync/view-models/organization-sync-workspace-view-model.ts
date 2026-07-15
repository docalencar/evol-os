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
  metrics: OrganizationSyncMetricViewModel[]
}

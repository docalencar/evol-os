export type ExecutiveScenarioStatus =
  | "healthy"
  | "attention"
  | "critical"


export type ExecutiveRecommendation =
  | "approve"
  | "review"
  | "reject"


export type ScenarioExecutiveSummary = Readonly<{
  status: ExecutiveScenarioStatus

  recommendation: ExecutiveRecommendation

  totalChanges: number

  structuralWarnings: number

  leadershipWarnings: number

  capacityWarnings: number

  criticalRisks: number

  summary: string
}>

export type PlanningInsightSeverity = "low" | "medium" | "high" | "critical"

export type PlanningInsightCategory = "workforce" | "structure" | "mobility" | "capacity"

export type PlanningInsightItem = Readonly<{
  id: string
  category: PlanningInsightCategory
  message: string
}>

export type PlanningWarning = PlanningInsightItem & Readonly<{
  severity: PlanningInsightSeverity
}>

export type PlanningRiskIndicator = Readonly<{
  id: string
  category: PlanningInsightCategory
  severity: PlanningInsightSeverity
  value: number
  threshold: number
}>

export type PlanningInsightsKpis = Readonly<{
  headcountDelta: number
  vacanciesDelta: number
  departmentsCreated: number
  departmentsArchived: number
  teamsCreated: number
  positionsCreated: number
  employeesTransferred: number
  employeesTerminated: number
  vacanciesClosed: number
}>

export type PlanningOrganizationalImpact = Readonly<{
  structuralChanges: number
  workforceChanges: number
  vacancyChanges: number
  departmentsRemoved: number
}>

export type PlanningInsightsSummary = Readonly<{
  totalChanges: number
  entitiesAffected: number
  organizationalGrowth: number
  organizationalReduction: number
  riskLevel: PlanningInsightSeverity
}>

export type PlanningInsights = Readonly<{
  summary: PlanningInsightsSummary
  kpis: PlanningInsightsKpis
  warnings: readonly PlanningWarning[]
  opportunities: readonly PlanningInsightItem[]
  organizationalImpact: PlanningOrganizationalImpact
  riskIndicators: readonly PlanningRiskIndicator[]
  recommendations: readonly PlanningInsightItem[]
}>

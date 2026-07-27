export const METRIC_DELTA_DIRECTIONS = [
  "increase",
  "decrease",
  "unchanged",
] as const

export type MetricDeltaDirection =
  (typeof METRIC_DELTA_DIRECTIONS)[number]

export type MetricDelta =
  Readonly<{
    current: number
    projected: number
    absolute: number
    percentage: number | null
    direction: MetricDeltaDirection
  }>

export type WorkforceIntelligence =
  Readonly<{
    headcount: MetricDelta
  }>

export type VacancyIntelligence =
  Readonly<{
    vacancies: MetricDelta
  }>

export type FinancialIntelligence =
  Readonly<{
    salaryMass: MetricDelta
  }>

export type OrganizationIntelligence =
  Readonly<{
    departments: MetricDelta
    positions: MetricDelta
  }>

export type ScenarioIntelligence =
  Readonly<{
    projectionId: string
    scenarioId: string
    projectionVersion: number
    generatedAt: Date
    workforce: WorkforceIntelligence
    vacancies: VacancyIntelligence
    financial: FinancialIntelligence
    organization: OrganizationIntelligence
  }>

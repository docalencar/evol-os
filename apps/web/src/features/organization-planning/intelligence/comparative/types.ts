import type {
  MetricDelta,
} from "../types"


export type ScenarioComparisonRecommendation =
  | "first"
  | "second"
  | "neutral"


export type ScenarioMetricComparison =
Readonly<{
  first: MetricDelta
  second: MetricDelta
  difference: number
}>



export type ScenarioComparison =
Readonly<{
  firstScenarioId: string
  secondScenarioId: string

  firstProjectionId: string
  secondProjectionId: string

  metrics: Readonly<{
    headcount: ScenarioMetricComparison
    vacancies: ScenarioMetricComparison
    salaryMass: ScenarioMetricComparison
    departments: ScenarioMetricComparison
    positions: ScenarioMetricComparison
  }>

  recommendation:
    ScenarioComparisonRecommendation

  summary: string
}>

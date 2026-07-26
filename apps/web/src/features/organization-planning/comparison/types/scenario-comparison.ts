import type {
  ScenarioComparisonSummary,
} from "./comparison-summary"

export type ScenarioComparison = Readonly<{
  scenarioId: string
  summary: ScenarioComparisonSummary
}>

import type { ScenarioComparisonResult } from "../../projection/comparison"
import type { PlanningInsightsSummary, PlanningInsightSeverity, PlanningWarning } from "../contracts/planning-insights-contracts"

const SEVERITY_ORDER: Record<PlanningInsightSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
}

export function createPlanningInsightsSummary(
  comparison: ScenarioComparisonResult,
  warnings: readonly PlanningWarning[]
): PlanningInsightsSummary {
  const headcountDelta = comparison.metrics.headcount.delta
  return Object.freeze({
    totalChanges: comparison.summary.totalChanges,
    entitiesAffected: comparison.summary.totalChanges,
    organizationalGrowth: Math.max(0, headcountDelta),
    organizationalReduction: Math.max(0, -headcountDelta),
    riskLevel: highestSeverity(warnings),
  })
}

function highestSeverity(warnings: readonly PlanningWarning[]): PlanningInsightSeverity {
  return warnings.reduce<PlanningInsightSeverity>(
    (highest, warning) => SEVERITY_ORDER[warning.severity] > SEVERITY_ORDER[highest] ? warning.severity : highest,
    "low"
  )
}

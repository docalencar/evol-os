import type { ScenarioComparisonResult } from "../../projection/comparison"
import { calculateOrganizationalImpact, calculatePlanningInsightsKpis } from "../calculators/planning-insights-calculator"
import type { PlanningInsights } from "../contracts/planning-insights-contracts"
import { evaluatePlanningOpportunities, evaluatePlanningRecommendations } from "../rules/planning-insight-rules"
import { createPlanningInsightsSummary } from "../summary/planning-insights-summary"
import { evaluatePlanningWarnings } from "../warnings/planning-warning-rules"

export class PlanningInsightsEngine {
  static create(): PlanningInsightsEngine {
    return new PlanningInsightsEngine()
  }

  analyze(comparison: ScenarioComparisonResult): PlanningInsights {
    const kpis = calculatePlanningInsightsKpis(comparison)
    const organizationalImpact = calculateOrganizationalImpact(comparison)
    const { warnings, riskIndicators } = evaluatePlanningWarnings(comparison, organizationalImpact)

    return Object.freeze({
      summary: createPlanningInsightsSummary(comparison, warnings),
      kpis,
      warnings,
      opportunities: evaluatePlanningOpportunities(kpis),
      organizationalImpact,
      riskIndicators,
      recommendations: evaluatePlanningRecommendations(warnings, organizationalImpact),
    })
  }
}

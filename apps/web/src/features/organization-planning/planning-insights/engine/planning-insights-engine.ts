import type { ScenarioComparisonResult } from "../../projection/comparison"
import { calculateOrganizationalImpact, calculatePlanningInsightsKpis } from "../calculators"
import type { PlanningInsights } from "../contracts"
import { evaluatePlanningOpportunities, evaluatePlanningRecommendations } from "../rules"
import { createPlanningInsightsSummary } from "../summary"
import { evaluatePlanningWarnings } from "../warnings"

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

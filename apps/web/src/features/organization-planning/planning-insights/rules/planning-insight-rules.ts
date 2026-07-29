import type { PlanningInsightItem, PlanningInsightsKpis, PlanningOrganizationalImpact, PlanningWarning } from "../contracts"

export function evaluatePlanningOpportunities(kpis: PlanningInsightsKpis): readonly PlanningInsightItem[] {
  const opportunities: PlanningInsightItem[] = []
  if (kpis.headcountDelta > 0) {
    opportunities.push(item("workforce_growth", "workforce", "O cenário projeta crescimento de headcount."))
  }
  if (kpis.positionsCreated > 0 || kpis.teamsCreated > 0) {
    opportunities.push(item("new_organizational_capacity", "capacity", "O cenário adiciona posições ou times à estrutura."))
  }
  return Object.freeze(opportunities)
}

export function evaluatePlanningRecommendations(
  warnings: readonly PlanningWarning[],
  impact: PlanningOrganizationalImpact
): readonly PlanningInsightItem[] {
  const warningIds = new Set(warnings.map((warning) => warning.id))
  const recommendations: PlanningInsightItem[] = []

  if (warningIds.has("headcount_reduction") || warningIds.has("high_terminations")) {
    recommendations.push(item("validate_succession_plan", "workforce", "Validar o plano de sucessão antes da execução."))
  }
  if (warningIds.has("high_transfers")) {
    recommendations.push(item("review_managerial_capacity", "mobility", "Revisar a capacidade gerencial das áreas impactadas."))
  }
  if (warningIds.has("departments_removed") || warningIds.has("excessive_structural_changes")) {
    recommendations.push(item("review_operational_impact", "structure", "Revisar o impacto operacional da mudança estrutural."))
  }
  if (impact.structuralChanges + impact.workforceChanges > 0) {
    recommendations.push(item("plan_change_communication", "workforce", "Planejar a comunicação das mudanças organizacionais."))
  }
  return Object.freeze(recommendations)
}

function item(id: string, category: PlanningInsightItem["category"], message: string): PlanningInsightItem {
  return Object.freeze({ id, category, message })
}

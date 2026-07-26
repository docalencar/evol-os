import type {
  ScenarioStructuralImpact,
} from "../structural-impact"

import type {
  ScenarioInsight,
} from "../insights"

import type {
  SpanOfControlResult,
} from "../span-of-control"

import type {
  PositionCapacityResult,
} from "../position-capacity"

import type {
  ScenarioComparisonSummary,
} from "../../comparison"

import type {
  ScenarioExecutiveSummary,
} from "./types"


type CalculateExecutiveSummaryInput = Readonly<{
  comparison: ScenarioComparisonSummary
  structuralImpact: ScenarioStructuralImpact
  insights: readonly ScenarioInsight[]
  spanOfControl: SpanOfControlResult
  positionCapacity: PositionCapacityResult
}>


export function calculateExecutiveScenarioSummary(
  input: CalculateExecutiveSummaryInput
): ScenarioExecutiveSummary {

  const leadershipRisks =
    input.spanOfControl.attentionCount +
    input.spanOfControl.criticalCount


  const capacityRisks =
    input.positionCapacity.attentionCount +
    input.positionCapacity.criticalCount


  const criticalRisks =
    input.insights.filter(
      (insight) =>
        insight.severity === "critical"
    ).length +
    input.spanOfControl.criticalCount +
    input.positionCapacity.criticalCount


  const structuralWarnings =
    input.structuralImpact.departments.variation +
    input.structuralImpact.teams.variation +
    input.structuralImpact.positions.variation


  const totalChanges =
    Object.values(input.comparison)
      .reduce(
        (total, value) =>
          total + value,
        0
      )


  if (criticalRisks > 0) {
    return Object.freeze({
      status: "critical",
      recommendation: "reject",
      totalChanges,
      structuralWarnings,
      leadershipWarnings: leadershipRisks,
      capacityWarnings: capacityRisks,
      criticalRisks,
      summary:
        "O cenário apresenta riscos críticos que precisam ser avaliados antes da aprovação.",
    })
  }


  if (
    leadershipRisks > 0 ||
    capacityRisks > 0 ||
    input.insights.length > 0
  ) {
    return Object.freeze({
      status: "attention",
      recommendation: "review",
      totalChanges,
      structuralWarnings,
      leadershipWarnings: leadershipRisks,
      capacityWarnings: capacityRisks,
      criticalRisks,
      summary:
        "O cenário apresenta pontos de atenção que devem ser revisados.",
    })
  }


  return Object.freeze({
    status: "healthy",
    recommendation: "approve",
    totalChanges,
    structuralWarnings,
    leadershipWarnings: 0,
    capacityWarnings: 0,
    criticalRisks: 0,
    summary:
      "O cenário apresenta baixo risco estrutural e está pronto para avaliação.",
  })
}

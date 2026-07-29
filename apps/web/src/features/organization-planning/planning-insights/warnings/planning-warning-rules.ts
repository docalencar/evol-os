import type { ScenarioComparisonResult } from "../../projection/comparison"
import type { PlanningOrganizationalImpact, PlanningRiskIndicator, PlanningWarning } from "../contracts"

const HEADCOUNT_REDUCTION_PERCENT = 25
const TERMINATION_PERCENT = 10
const TRANSFER_PERCENT = 20
const STRUCTURAL_CHANGE_COUNT = 10

export function evaluatePlanningWarnings(
  comparison: ScenarioComparisonResult,
  impact: PlanningOrganizationalImpact
): Readonly<{ warnings: readonly PlanningWarning[]; riskIndicators: readonly PlanningRiskIndicator[] }> {
  const warnings: PlanningWarning[] = []
  const riskIndicators: PlanningRiskIndicator[] = []
  const headcountBefore = comparison.metrics.headcount.before
  const headcountReductionPercent = percentageOf(
    Math.max(0, -comparison.metrics.headcount.delta),
    headcountBefore
  )
  const terminationPercent = percentageOf(comparison.summary.employees.terminated, headcountBefore)
  const transferPercent = percentageOf(comparison.summary.employees.transferred, headcountBefore)

  addThresholdRisk({
    id: "headcount_reduction",
    category: "workforce",
    value: headcountReductionPercent,
    threshold: HEADCOUNT_REDUCTION_PERCENT,
    severity: "critical",
    message: "A redução projetada de headcount atingiu pelo menos 25%.",
    warnings,
    riskIndicators,
  })
  addThresholdRisk({
    id: "high_terminations",
    category: "workforce",
    value: terminationPercent,
    threshold: TERMINATION_PERCENT,
    severity: "high",
    message: "Os desligamentos representam pelo menos 10% do headcount inicial.",
    warnings,
    riskIndicators,
  })
  addThresholdRisk({
    id: "high_transfers",
    category: "mobility",
    value: transferPercent,
    threshold: TRANSFER_PERCENT,
    severity: "medium",
    message: "As transferências representam pelo menos 20% do headcount inicial.",
    warnings,
    riskIndicators,
  })
  addThresholdRisk({
    id: "excessive_structural_changes",
    category: "structure",
    value: impact.structuralChanges,
    threshold: STRUCTURAL_CHANGE_COUNT,
    severity: "medium",
    message: "O cenário contém pelo menos 10 alterações estruturais.",
    warnings,
    riskIndicators,
  })

  if (impact.departmentsRemoved > 0) {
    warnings.push(Object.freeze({
      id: "departments_removed",
      category: "structure",
      severity: "high",
      message: "O cenário arquiva ou remove um ou mais departamentos.",
    }))
  }

  return Object.freeze({ warnings: Object.freeze(warnings), riskIndicators: Object.freeze(riskIndicators) })
}

function percentageOf(value: number, total: number): number {
  if (total <= 0 || value <= 0) return 0
  return Math.round((value / total) * 10_000) / 100
}

function addThresholdRisk(input: {
  id: string
  category: PlanningWarning["category"]
  value: number
  threshold: number
  severity: PlanningWarning["severity"]
  message: string
  warnings: PlanningWarning[]
  riskIndicators: PlanningRiskIndicator[]
}) {
  if (input.value < input.threshold) return
  input.riskIndicators.push(Object.freeze({
    id: input.id,
    category: input.category,
    severity: input.severity,
    value: input.value,
    threshold: input.threshold,
  }))
  input.warnings.push(Object.freeze({
    id: input.id,
    category: input.category,
    severity: input.severity,
    message: input.message,
  }))
}

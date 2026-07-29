import type { PlanningInsightSeverity } from "../../planning-insights"

export type PlanningPresentationColor = "slate" | "blue" | "amber" | "orange" | "red" | "green"
export type PlanningPresentationIcon =
  | "alert-triangle"
  | "arrow-down"
  | "arrow-right-left"
  | "arrow-up"
  | "building"
  | "check-circle"
  | "circle"
  | "lightbulb"
  | "users"

export type PlanningSeverityViewModel = Readonly<{
  value: PlanningInsightSeverity
  label: string
  riskLabel: string
  color: PlanningPresentationColor
  icon: PlanningPresentationIcon
}>

const severityPresentation: Readonly<Record<PlanningInsightSeverity, PlanningSeverityViewModel>> = Object.freeze({
  low: Object.freeze({ value: "low", label: "Baixo", riskLabel: "Risco Baixo", color: "slate", icon: "circle" }),
  medium: Object.freeze({ value: "medium", label: "Médio", riskLabel: "Risco Médio", color: "amber", icon: "alert-triangle" }),
  high: Object.freeze({ value: "high", label: "Alto", riskLabel: "Risco Alto", color: "orange", icon: "alert-triangle" }),
  critical: Object.freeze({ value: "critical", label: "Crítico", riskLabel: "Risco Crítico", color: "red", icon: "alert-triangle" }),
})

export function presentPlanningSeverity(severity: PlanningInsightSeverity): PlanningSeverityViewModel {
  return severityPresentation[severity]
}

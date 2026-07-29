import type { PlanningPresentationColor, PlanningPresentationIcon, PlanningSeverityViewModel } from "../shared/planning-severity"

export type PlanningKpiCardViewModel = Readonly<{
  id: string
  label: string
  value: number
  valueLabel: string
  color: PlanningPresentationColor
  icon: PlanningPresentationIcon
}>

export type PlanningWarningViewModel = Readonly<{
  id: string
  title: string
  description: string
  category: string
  badge: string
  color: PlanningPresentationColor
  icon: PlanningPresentationIcon
}>

export type PlanningRecommendationViewModel = Readonly<{
  id: string
  title: string
  description: string
  priority: "recommended"
  priorityLabel: "Recomendada"
}>

export type PlanningOpportunityViewModel = Readonly<{
  id: string
  title: string
  description: string
  category: string
  color: "green"
  icon: "lightbulb"
}>

export type PlanningRiskIndicatorViewModel = Readonly<{
  id: string
  label: string
  value: number
  valueLabel: string
  threshold: number
  thresholdLabel: string
  severity: PlanningSeverityViewModel
}>

export type PlanningInsightsViewModel = Readonly<{
  summary: Readonly<{
    totalChanges: number
    totalChangesLabel: string
    entitiesAffected: number
    entitiesAffectedLabel: string
    organizationalGrowth: number
    organizationalGrowthLabel: string
    organizationalReduction: number
    organizationalReductionLabel: string
    risk: PlanningSeverityViewModel
  }>
  kpis: readonly PlanningKpiCardViewModel[]
  warnings: readonly PlanningWarningViewModel[]
  opportunities: readonly PlanningOpportunityViewModel[]
  riskIndicators: readonly PlanningRiskIndicatorViewModel[]
  recommendations: readonly PlanningRecommendationViewModel[]
}>

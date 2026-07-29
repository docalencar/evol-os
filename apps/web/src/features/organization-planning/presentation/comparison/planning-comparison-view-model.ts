import type { PlanningPresentationColor, PlanningPresentationIcon } from "../shared/planning-severity"

export type PlanningComparisonMetricViewModel = Readonly<{
  id: "headcount" | "vacancies" | "departments" | "positions"
  label: string
  before: number
  beforeLabel: string
  after: number
  afterLabel: string
  delta: number
  deltaLabel: string
  color: PlanningPresentationColor
  icon: PlanningPresentationIcon
}>

export type PlanningComparisonChangeViewModel = Readonly<{
  id: string
  entityId: string
  entityLabel: string
  changeType: "created" | "updated" | "archived" | "removed" | "transferred" | "terminated" | "closed"
  changeLabel: string
  changedFields: readonly string[]
}>

export type PlanningComparisonSectionViewModel = Readonly<{
  id: "departments" | "teams" | "positions" | "employees" | "vacancies"
  label: string
  total: number
  totalLabel: string
  changes: readonly PlanningComparisonChangeViewModel[]
  isEmpty: boolean
}>

export type PlanningComparisonViewModel = Readonly<{
  summary: Readonly<{
    totalChanges: number
    totalChangesLabel: string
    isEmpty: boolean
  }>
  metrics: readonly PlanningComparisonMetricViewModel[]
  sections: readonly PlanningComparisonSectionViewModel[]
}>

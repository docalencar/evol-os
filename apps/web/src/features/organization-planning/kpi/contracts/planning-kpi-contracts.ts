import type { KPIEvaluationDTO } from "../../../kpi-engine"
import type {
  ProjectedDepartment,
  ProjectedEmployee,
  ProjectedOrganization,
  ProjectedPosition,
  ProjectedTeam,
  ProjectionInternalEvent,
} from "../../projection"
import type { PlanningScenarioContract } from "../../types/planning-contracts"

export type PlanningKPIContext = Readonly<{
  companyId: string
  periodStart: Date
  periodEnd: Date
  evaluatedAt: Date
  requestedBy?: string
}>

export type ProjectedScenario = Readonly<{
  scenario: PlanningScenarioContract
  events: readonly ProjectionInternalEvent[]
}>

export type PlanningKPISource = Readonly<{
  current: ProjectedOrganization
  planned: ProjectedOrganization
  departments: readonly ProjectedDepartment[]
  teams: readonly ProjectedTeam[]
  positions: readonly ProjectedPosition[]
  employees: readonly ProjectedEmployee[]
  scenario: ProjectedScenario
}>

export type PlanningKPIResult = Readonly<{
  key: string
  value: number
}>

export type PlanningKPISnapshot = Readonly<{
  source: PlanningKPISource
  results: readonly PlanningKPIResult[]
}>

export interface PlanningKPIProvider {
  readonly keys: readonly string[]
  calculate(source: PlanningKPISource): readonly PlanningKPIResult[]
}

export type PlanningKPIEvaluationResult = Readonly<{
  snapshot: PlanningKPISnapshot
  evaluations: readonly KPIEvaluationDTO[]
}>

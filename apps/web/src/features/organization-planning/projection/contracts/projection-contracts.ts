import type {
  ChangeSet,
  PlanningScenarioContract,
  PublishedSnapshotContract,
} from "../../types/planning-contracts"

export type ProjectedDepartment = Readonly<{ id: string }>
export type ProjectedTeam = Readonly<{ id: string; departmentId: string | null }>
export type ProjectedPosition = Readonly<{ id: string; departmentId: string | null }>
export type ProjectedEmployee = Readonly<{ id: string; positionId: string | null }>
export type ProjectedVacancy = Readonly<{ id: string; positionId: string | null }>

export type ProjectionMetrics = Readonly<{
  headcount: number
  vacancies: number
  salaryMass: number
  departments: number
  positions: number
}>

export type ProjectedOrganization = Readonly<{
  departments: readonly ProjectedDepartment[]
  teams: readonly ProjectedTeam[]
  positions: readonly ProjectedPosition[]
  employees: readonly ProjectedEmployee[]
  vacancies: readonly ProjectedVacancy[]
  metrics: ProjectionMetrics
}>

export type ProjectionIssue = Readonly<{
  code: string
  message: string
  changeSetId?: string
}>

export type ProjectionInternalEvent = Readonly<{
  type: "change-set.executed" | "change-set.unhandled"
  changeSetId: string
  executor?: string
}>

export type ProjectionInput = Readonly<{
  snapshot: PublishedSnapshotContract
  scenario: PlanningScenarioContract
  changeSets: readonly ChangeSet[]
}>

export const EMPTY_PROJECTION_METRICS: ProjectionMetrics = Object.freeze({
  headcount: 0,
  vacancies: 0,
  salaryMass: 0,
  departments: 0,
  positions: 0,
})

export function createEmptyProjectedOrganization(): ProjectedOrganization {
  return freezeProjectedOrganization({
    departments: [],
    teams: [],
    positions: [],
    employees: [],
    vacancies: [],
    metrics: EMPTY_PROJECTION_METRICS,
  })
}

export function freezeProjectedOrganization(
  organization: ProjectedOrganization
): ProjectedOrganization {
  return Object.freeze({
    departments: freezeEntities(organization.departments),
    teams: freezeEntities(organization.teams),
    positions: freezeEntities(organization.positions),
    employees: freezeEntities(organization.employees),
    vacancies: freezeEntities(organization.vacancies),
    metrics: Object.freeze({ ...organization.metrics }),
  })
}

function freezeEntities<T extends object>(entities: readonly T[]) {
  return Object.freeze(entities.map((entity) => Object.freeze({ ...entity })))
}

import type {
  PositionEmploymentType,
  PositionHierarchicalLevel,
  PositionTravelRequirement,
  PositionWorkModel,
} from "../../../organization/positions/types/position"
import type {
  ChangeSet,
  PlanningScenarioContract,
  PublishedSnapshotContract,
} from "../../types/planning-contracts"

export const PROJECTED_DEPARTMENT_STATUSES = [
  "active",
  "archived",
] as const

export type ProjectedDepartmentStatus =
  (typeof PROJECTED_DEPARTMENT_STATUSES)[number]

export const PROJECTED_TEAM_STATUSES = [
  "active",
  "archived",
] as const

export type ProjectedTeamStatus =
  (typeof PROJECTED_TEAM_STATUSES)[number]

export const PROJECTED_POSITION_STATUSES = [
  "active",
  "archived",
] as const

export type ProjectedPositionStatus =
  (typeof PROJECTED_POSITION_STATUSES)[number]

export type ProjectedDepartment = Readonly<{
  id: string
  name: string
  code: string | null
  description: string | null
  parentDepartmentId: string | null
  status: ProjectedDepartmentStatus
}>

export type ProjectedTeam = Readonly<{
  id: string
  name: string
  code: string | null
  description: string | null
  departmentId: string | null
  status: ProjectedTeamStatus
}>

export type ProjectedPosition = Readonly<{
  id: string
  name: string
  description: string | null
  departmentId: string | null
  hierarchicalLevel: PositionHierarchicalLevel
  weeklyWorkloadHours: number
  workModel: PositionWorkModel
  employmentType: PositionEmploymentType
  travelRequirement: PositionTravelRequirement
  status: ProjectedPositionStatus
}>

export type ProjectedEmployee = Readonly<{
  id: string
  positionId: string | null
}>

export type ProjectedVacancy = Readonly<{
  id: string
  positionId: string | null
}>

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

export const DEPARTMENT_MUTABLE_FIELDS = [
  "name",
  "code",
  "description",
  "parentDepartmentId",
] as const

export type DepartmentMutableField =
  (typeof DEPARTMENT_MUTABLE_FIELDS)[number]

export const TEAM_MUTABLE_FIELDS = [
  "name",
  "code",
  "description",
  "departmentId",
] as const

export type TeamMutableField =
  (typeof TEAM_MUTABLE_FIELDS)[number]

export const POSITION_MUTABLE_FIELDS = [
  "name",
  "description",
  "hierarchicalLevel",
  "weeklyWorkloadHours",
  "workModel",
  "employmentType",
  "travelRequirement",
] as const

export type PositionMutableField =
  (typeof POSITION_MUTABLE_FIELDS)[number]

export type ProjectionInternalEvent =
  | Readonly<{
      type: "change-set.executed"
      changeSetId: string
      executor: string
    }>
  | Readonly<{
      type: "change-set.unhandled"
      changeSetId: string
    }>
  | Readonly<{
      type: "department.created"
      changeSetId: string
      departmentId: string
    }>
  | Readonly<{
      type: "department.updated"
      changeSetId: string
      departmentId: string
      changedFields: readonly DepartmentMutableField[]
    }>
  | Readonly<{
      type: "department.archived"
      changeSetId: string
      departmentId: string
    }>
  | Readonly<{
      type: "team.created"
      changeSetId: string
      teamId: string
    }>
  | Readonly<{
      type: "team.updated"
      changeSetId: string
      teamId: string
      changedFields: readonly TeamMutableField[]
    }>
  | Readonly<{
      type: "team.archived"
      changeSetId: string
      teamId: string
    }>
  | Readonly<{
      type: "position.created"
      changeSetId: string
      positionId: string
    }>
  | Readonly<{
      type: "position.updated"
      changeSetId: string
      positionId: string
      changedFields: readonly PositionMutableField[]
    }>
  | Readonly<{
      type: "position.archived"
      changeSetId: string
      positionId: string
    }>
  | Readonly<{
      type: "position.moved"
      changeSetId: string
      positionId: string
      previousDepartmentId: string | null
      departmentId: string | null
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

function freezeEntities<T extends object>(
  entities: readonly T[]
): readonly Readonly<T>[] {
  return Object.freeze(
    entities.map((entity) => Object.freeze({ ...entity }))
  )
}

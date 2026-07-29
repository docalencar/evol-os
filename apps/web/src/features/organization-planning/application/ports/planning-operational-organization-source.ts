import type { ProjectedPosition } from "../../projection"

export type PlanningOperationalDepartment = Readonly<{
  id: string
  name: string
  code: string | null
  description: string | null
  parentDepartmentId: string | null
}>

export type PlanningOperationalTeam = Readonly<{
  id: string
  name: string
  code: string | null
  description: string | null
  departmentId: string | null
}>

export type PlanningOperationalPosition = Readonly<{
  id: string
  name: string
  description: string | null
  departmentId: string | null
  hierarchicalLevel: ProjectedPosition["hierarchicalLevel"]
  weeklyWorkloadHours: number
  workModel: ProjectedPosition["workModel"]
  employmentType: ProjectedPosition["employmentType"]
  travelRequirement: ProjectedPosition["travelRequirement"]
  active: boolean
}>

export type PlanningOperationalEmployee = Readonly<{
  id: string
  positionId: string | null
}>

export type PlanningOperationalOrganization = Readonly<{
  departments: readonly PlanningOperationalDepartment[]
  teams: readonly PlanningOperationalTeam[]
  positions: readonly PlanningOperationalPosition[]
  employees: readonly PlanningOperationalEmployee[]
}>

export interface PlanningOperationalOrganizationSource {
  loadByCompany(
    companyId: string
  ): Promise<PlanningOperationalOrganization>
}

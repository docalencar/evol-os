import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import type { Position } from "@/features/organization/positions"

import {
  createTenantDashboardReadRepository,
  type TenantOrganizationDirectoryRow,
  type TenantPeopleDirectoryRow,
} from "../repositories/tenant-dashboard-read-repository"
import type { DashboardJobOpening } from "./get-app-dashboard-read-model"

type SelectOption = Readonly<{ id: string; name: string }>

export type PeopleCreationOptions = Readonly<{
  teams: SelectOption[]
  positions: SelectOption[]
  managers: SelectOption[]
}>

export type RecruitmentWorkspaceReadModel = Readonly<{
  jobOpenings: DashboardJobOpening[]
  options: Readonly<{
    departments: SelectOption[]
    positions: Readonly<{
      id: string
      name: string
      departmentId: string | null
      status: Position["status"]
    }>[]
    employees: Readonly<{
      id: string
      fullName: string
      status: "active" | "inactive" | "on_leave"
    }>[]
  }>
}>

function organizationRows(
  rows: readonly TenantOrganizationDirectoryRow[],
  entityType: TenantOrganizationDirectoryRow["entity_type"],
) {
  return rows.filter((row) => row.entity_type === entityType)
}

function positionStatus(row: TenantOrganizationDirectoryRow): Position["status"] {
  if (
    row.status === "draft"
    || row.status === "active"
    || row.status === "inactive"
    || row.status === "obsolete"
  ) {
    return row.status
  }

  throw new Error("Não foi possível validar os dados da organização.")
}

export async function getPeopleCreationOptions(companyId: string): Promise<PeopleCreationOptions> {
  const database = await createServerDatabase()
  const repository = createTenantDashboardReadRepository(database)
  const [organization, people] = await Promise.all([
    repository.loadOrganization(companyId),
    repository.loadPeople(companyId),
  ])

  return {
    teams: organizationRows(organization, "team").map((row) => ({
      id: row.entity_id,
      name: row.name,
    })),
    positions: organizationRows(organization, "position").map((row) => ({
      id: row.entity_id,
      name: row.name,
    })),
    managers: people.map((row) => ({ id: row.person_id, name: row.full_name })),
  }
}

export async function getTenantPeopleDirectory(
  companyId: string,
): Promise<readonly TenantPeopleDirectoryRow[]> {
  const database = await createServerDatabase()
  return createTenantDashboardReadRepository(database).loadPeople(companyId)
}

export async function getRecruitmentWorkspaceReadModel(
  companyId: string,
): Promise<RecruitmentWorkspaceReadModel> {
  const database = await createServerDatabase()
  const repository = createTenantDashboardReadRepository(database)
  const [organization, people, recruitment] = await Promise.all([
    repository.loadOrganization(companyId),
    repository.loadPeople(companyId),
    repository.loadRecruitment(companyId),
  ])
  const departments = organizationRows(organization, "department")
  const positions = organizationRows(organization, "position")

  return {
    jobOpenings: recruitment.map((row) => ({
      id: row.job_opening_id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      departmentId: row.department_id,
      positionId: row.position_id,
      requestingManagerId: row.requesting_manager_id,
      recruiterId: row.recruiter_id,
      targetHireDate: row.target_hire_date,
      updatedAt: row.updated_at,
    })),
    options: {
      departments: departments.map((row) => ({ id: row.entity_id, name: row.name })),
      positions: positions.map((row) => ({
        id: row.entity_id,
        name: row.name,
        departmentId: row.department_id,
        status: positionStatus(row),
      })),
      employees: people.map((row) => ({
        id: row.person_id,
        fullName: row.full_name,
        status: row.status,
      })),
    },
  }
}

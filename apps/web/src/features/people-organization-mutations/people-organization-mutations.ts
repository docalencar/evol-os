import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import {
  PeopleOrganizationMutationError,
  toMutationErrorCode,
} from "./errors"
import {
  intentKey,
  normalizeEmptyToNull,
  type Value,
} from "./idempotency"

const nn = normalizeEmptyToNull

export type MutationResult = Readonly<{
  status: string
  personId?: string
  departmentId?: string
  teamId?: string
  positionId?: string
  accessDeactivated?: boolean
}>

async function callMutation(
  rpc: string,
  params: Record<string, unknown>
): Promise<MutationResult> {
  const database = await createServerDatabase()
  const { data, error } = await database.rpc(rpc, params)

  if (error) {
    throw new PeopleOrganizationMutationError(
      toMutationErrorCode(error.message)
    )
  }

  return (data ?? { status: "succeeded" }) as MutationResult
}

export type PersonMutationInput = Readonly<{
  fullName?: Value
  email?: Value
  phone?: Value
  birthDate?: Value
  hireDate?: Value
  status?: Value
  teamId?: Value
  positionId?: Value
  managerId?: Value
  discProfile?: Value
}>

export function createPerson(
  companyId: string,
  input: PersonMutationInput,
  submissionId: string
): Promise<MutationResult> {
  return callMutation("create_tenant_person_v1", {
    p_company_id: companyId,
    p_full_name: nn(input.fullName),
    p_email: nn(input.email),
    p_phone: nn(input.phone),
    p_birth_date: nn(input.birthDate),
    p_hire_date: nn(input.hireDate),
    p_status: nn(input.status) ?? "active",
    p_team_id: nn(input.teamId),
    p_position_id: nn(input.positionId),
    p_manager_id: nn(input.managerId),
    p_disc_profile: nn(input.discProfile),
    p_idempotency_key: intentKey("person:create", companyId, submissionId),
  })
}

export function updatePerson(
  companyId: string,
  personId: string,
  input: PersonMutationInput
): Promise<MutationResult> {
  return callMutation("update_tenant_person_v1", {
    p_company_id: companyId,
    p_person_id: personId,
    p_full_name: nn(input.fullName),
    p_email: nn(input.email),
    p_phone: nn(input.phone),
    p_birth_date: nn(input.birthDate),
    p_hire_date: nn(input.hireDate),
    // No silent default: an absent status reaches the RPC as null and fails
    // closed (VALIDATION_FAILED) instead of being coerced to "active".
    p_status: nn(input.status),
    p_team_id: nn(input.teamId),
    p_position_id: nn(input.positionId),
    p_manager_id: nn(input.managerId),
    p_disc_profile: nn(input.discProfile),
  })
}

export function archivePerson(
  companyId: string,
  personId: string
): Promise<MutationResult> {
  return callMutation("archive_tenant_person_v1", {
    p_company_id: companyId,
    p_person_id: personId,
  })
}

export type DepartmentMutationInput = Readonly<{
  name?: Value
  description?: Value
  leaderId?: Value
}>

export function createDepartment(
  companyId: string,
  input: DepartmentMutationInput,
  submissionId: string
): Promise<MutationResult> {
  return callMutation("create_tenant_department_v1", {
    p_company_id: companyId,
    p_name: nn(input.name),
    p_description: nn(input.description),
    p_manager_id: nn(input.leaderId),
    p_idempotency_key: intentKey(
      "department:create",
      companyId,
      submissionId
    ),
  })
}

export function updateDepartment(
  companyId: string,
  departmentId: string,
  input: DepartmentMutationInput
): Promise<MutationResult> {
  return callMutation("update_tenant_department_v1", {
    p_company_id: companyId,
    p_department_id: departmentId,
    p_name: nn(input.name),
    p_description: nn(input.description),
    p_manager_id: nn(input.leaderId),
  })
}

export function archiveDepartment(
  companyId: string,
  departmentId: string
): Promise<MutationResult> {
  return callMutation("archive_tenant_department_v1", {
    p_company_id: companyId,
    p_department_id: departmentId,
  })
}

export type TeamMutationInput = Readonly<{
  name?: Value
  description?: Value
  departmentId?: Value
  parentTeamId?: Value
  leaderId?: Value
}>

export function createTeam(
  companyId: string,
  input: TeamMutationInput,
  submissionId: string
): Promise<MutationResult> {
  return callMutation("create_tenant_team_v1", {
    p_company_id: companyId,
    p_name: nn(input.name),
    p_description: nn(input.description),
    p_department_id: nn(input.departmentId),
    p_parent_team_id: nn(input.parentTeamId),
    p_manager_id: nn(input.leaderId),
    p_idempotency_key: intentKey("team:create", companyId, submissionId),
  })
}

export function updateTeam(
  companyId: string,
  teamId: string,
  input: TeamMutationInput
): Promise<MutationResult> {
  return callMutation("update_tenant_team_v1", {
    p_company_id: companyId,
    p_team_id: teamId,
    p_name: nn(input.name),
    p_description: nn(input.description),
    p_department_id: nn(input.departmentId),
    p_parent_team_id: nn(input.parentTeamId),
    p_manager_id: nn(input.leaderId),
  })
}

export function archiveTeam(
  companyId: string,
  teamId: string
): Promise<MutationResult> {
  return callMutation("archive_tenant_team_v1", {
    p_company_id: companyId,
    p_team_id: teamId,
  })
}

export type PositionMutationInput = Readonly<{
  name?: Value
  description?: Value
  departmentId?: Value
  hierarchicalLevel?: Value
  status?: Value
  weeklyWorkloadHours?: number | null
  workModel?: Value
  employmentType?: Value
  travelRequirement?: Value
}>

export function createPosition(
  companyId: string,
  input: PositionMutationInput,
  submissionId: string
): Promise<MutationResult> {
  return callMutation("create_tenant_position_v1", {
    p_company_id: companyId,
    p_name: nn(input.name),
    p_description: nn(input.description),
    p_department_id: nn(input.departmentId),
    p_hierarchical_level: nn(input.hierarchicalLevel),
    p_status: nn(input.status),
    p_weekly_workload_hours: input.weeklyWorkloadHours ?? null,
    p_work_model: nn(input.workModel),
    p_employment_type: nn(input.employmentType),
    p_travel_requirement: nn(input.travelRequirement),
    p_idempotency_key: intentKey(
      "position:create",
      companyId,
      submissionId
    ),
  })
}

export function updatePosition(
  companyId: string,
  positionId: string,
  input: PositionMutationInput
): Promise<MutationResult> {
  return callMutation("update_tenant_position_v1", {
    p_company_id: companyId,
    p_position_id: positionId,
    p_name: nn(input.name),
    p_description: nn(input.description),
    p_department_id: nn(input.departmentId),
    p_hierarchical_level: nn(input.hierarchicalLevel),
    p_status: nn(input.status),
    p_weekly_workload_hours: input.weeklyWorkloadHours ?? null,
    p_work_model: nn(input.workModel),
    p_employment_type: nn(input.employmentType),
    p_travel_requirement: nn(input.travelRequirement),
  })
}

export function archivePosition(
  companyId: string,
  positionId: string
): Promise<MutationResult> {
  return callMutation("archive_tenant_position_v1", {
    p_company_id: companyId,
    p_position_id: positionId,
  })
}

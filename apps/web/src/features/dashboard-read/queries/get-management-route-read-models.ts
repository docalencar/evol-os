import "server-only"

import { z } from "zod"

import { createServerDatabase } from "@/lib/database/server-database"
import type { ActivityTimelineItemViewModel } from "@/features/timeline/view-models/activity-timeline-item-view-model"

import { createTenantDashboardReadRepository } from "../repositories/tenant-dashboard-read-repository"

const uuid = z.string().uuid()
const nullableUuid = uuid.nullable()
const timestamp = z.string().datetime({ offset: true })
const nullableText = z.string().nullable()

const personSchema = z
  .object({
    person_id: uuid,
    full_name: z.string().min(1),
    email: nullableText,
    phone: nullableText,
    birth_date: nullableText,
    hire_date: nullableText,
    status: z.enum(["active", "inactive", "on_leave"]),
    has_user_access: z.boolean(),
    manager_id: nullableUuid,
    manager_name: nullableText,
    team_id: nullableUuid,
    team_name: nullableText,
    position_id: nullableUuid,
    position_name: nullableText,
    disc_profile: z.enum(["D", "I", "S", "C"]).nullable(),
    avatar_url: nullableText,
    created_at: timestamp,
    updated_at: timestamp,
  })
  .strict()

const departmentSchema = z
  .object({
    department_id: uuid,
    name: z.string().min(1),
    description: nullableText,
    leader_id: nullableUuid,
    parent_department_id: nullableUuid,
    created_at: timestamp,
    updated_at: timestamp,
  })
  .strict()

const teamSchema = z
  .object({
    team_id: uuid,
    name: z.string().min(1),
    description: nullableText,
    department_id: nullableUuid,
    parent_team_id: nullableUuid,
    leader_id: nullableUuid,
    created_at: timestamp,
    updated_at: timestamp,
  })
  .strict()

const positionSchema = z
  .object({
    position_id: uuid,
    name: z.string().min(1),
    description: nullableText,
    department_id: nullableUuid,
    hierarchical_level: z.enum([
      "intern",
      "assistant",
      "analyst",
      "specialist",
      "coordinator",
      "supervisor",
      "manager",
      "director",
      "executive",
    ]),
    status: z.enum([
      "draft",
      "active",
      "inactive",
      "obsolete",
    ]),
    weekly_workload_hours: z.number().int(),
    work_model: z.enum(["on_site", "hybrid", "remote"]),
    employment_type: z.enum([
      "clt",
      "pj",
      "intern",
      "apprentice",
      "temporary",
      "outsourced",
      "contractor",
      "other",
    ]),
    travel_requirement: z.enum([
      "none",
      "occasional",
      "frequent",
    ]),
    created_at: timestamp,
    updated_at: timestamp,
  })
  .strict()

const requirementSchema = z
  .object({
    requirement_id: uuid,
    position_id: uuid,
    category: z.enum([
      "education",
      "experience",
      "certification",
      "language",
      "knowledge",
      "other",
    ]),
    value: z.string().min(1),
    required: z.boolean(),
    notes: nullableText,
    created_at: timestamp,
    updated_at: timestamp,
  })
  .strict()

const competencySchema = z
  .object({
    position_competency_id: uuid,
    position_id: uuid,
    competency_id: uuid,
    competency_name: z.string().min(1),
    expected_level: z.number().int(),
    weight: z.number().int(),
    required: z.boolean(),
    competency_type: z.enum([
      "core",
      "leadership",
      "promotion",
      "optional",
    ]),
    notes: nullableText,
    created_at: timestamp,
    updated_at: timestamp,
  })
  .strict()

const activitySchema = z
  .object({
    activity_id: uuid,
    activity_type: z.string().min(1),
    module: z.string().min(1),
    title: z.string().min(1),
    description: nullableText,
    actor_type: z.enum([
      "user",
      "system",
      "automation",
      "integration",
    ]),
    entity_type: z.enum([
      "department",
      "team",
      "position",
      "person",
    ]),
    entity_id: uuid,
    occurred_at: timestamp,
    created_at: timestamp,
  })
  .strict()

export class ManagementRouteReadError extends Error {
  constructor() {
    super(
      "Não foi possível carregar os dados desta página."
    )
    this.name = "ManagementRouteReadError"
  }
}

async function rpcRows<T>(
  name: string,
  parameters: Record<string, unknown>,
  schema: z.ZodType<T>
): Promise<T> {
  const database = await createServerDatabase()
  let response: { data: unknown; error: unknown }
  try {
    response = await database.rpc(name, parameters)
  } catch {
    throw new ManagementRouteReadError()
  }
  if (response.error) throw new ManagementRouteReadError()
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) throw new ManagementRouteReadError()
  return parsed.data
}

export async function getManagementPeople(
  companyId: string
) {
  const rows = await rpcRows(
    "get_tenant_people_management_v1",
    { p_company_id: companyId },
    z.array(personSchema)
  )
  return rows.map((row) => ({
    id: row.person_id,
    company_id: companyId,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    birth_date: row.birth_date,
    hire_date: row.hire_date,
    status: row.status,
    has_user_access: row.has_user_access,
    manager_id: row.manager_id,
    manager_name: row.manager_name,
    team_id: row.team_id,
    team_name: row.team_name,
    position_id: row.position_id,
    position_name: row.position_name,
    teams: row.team_name ? { name: row.team_name } : null,
    positions: row.position_name
      ? { name: row.position_name }
      : null,
    disc_profile: row.disc_profile,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

export async function getManagementPerson(
  companyId: string,
  personId: string
) {
  const rows = await rpcRows(
    "get_tenant_person_profile_v1",
    { p_company_id: companyId, p_person_id: personId },
    z.array(personSchema)
  )
  const row = rows[0]
  if (!row) return null
  return (
    await getManagementPeopleFromRows(companyId, [row])
  )[0]
}

async function getManagementPeopleFromRows(
  companyId: string,
  rows: z.infer<typeof personSchema>[]
) {
  return rows.map((row) => ({
    id: row.person_id,
    company_id: companyId,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    birth_date: row.birth_date,
    hire_date: row.hire_date,
    status: row.status,
    has_user_access: row.has_user_access,
    manager_id: row.manager_id,
    manager_name: row.manager_name,
    team_id: row.team_id,
    team_name: row.team_name,
    position_id: row.position_id,
    position_name: row.position_name,
    teams: row.team_name ? { name: row.team_name } : null,
    positions: row.position_name
      ? { name: row.position_name }
      : null,
    disc_profile: row.disc_profile,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

export async function getManagementDepartments(
  companyId: string
) {
  const rows = await rpcRows(
    "get_tenant_departments_management_v1",
    { p_company_id: companyId },
    z.array(departmentSchema)
  )
  return rows.map((row) => ({
    id: row.department_id,
    company_id: companyId,
    companyId,
    name: row.name,
    description: row.description,
    manager_id: row.leader_id,
    leaderId: row.leader_id,
    parent_department_id: row.parent_department_id,
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
    deleted_at: null,
    archivedAt: null,
  }))
}

export async function getManagementTeams(
  companyId: string
) {
  const rows = await rpcRows(
    "get_tenant_teams_management_v1",
    { p_company_id: companyId },
    z.array(teamSchema)
  )
  return rows.map((row) => ({
    id: row.team_id,
    company_id: companyId,
    name: row.name,
    description: row.description,
    department_id: row.department_id,
    parent_team_id: row.parent_team_id,
    manager_id: row.leader_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: null,
  }))
}

export async function getManagementPositions(
  companyId: string
) {
  const rows = await rpcRows(
    "get_tenant_positions_management_v1",
    { p_company_id: companyId },
    z.array(positionSchema)
  )
  return rows.map((row) => ({
    id: row.position_id,
    company_id: companyId,
    name: row.name,
    description: row.description,
    department_id: row.department_id,
    hierarchical_level: row.hierarchical_level,
    status: row.status,
    weekly_workload_hours: row.weekly_workload_hours,
    work_model: row.work_model,
    employment_type: row.employment_type,
    travel_requirement: row.travel_requirement,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: null,
  }))
}

export async function getManagementPositionRequirements(
  companyId: string,
  positionId: string
) {
  const rows = await rpcRows(
    "get_tenant_position_requirements_v1",
    { p_company_id: companyId, p_position_id: positionId },
    z.array(requirementSchema)
  )
  return rows.map((row) => ({
    id: row.requirement_id,
    company_id: companyId,
    position_id: row.position_id,
    category: row.category,
    value: row.value,
    required: row.required,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    archived_at: null,
  }))
}

export async function getManagementPositionCompetencies(
  companyId: string,
  positionId: string
) {
  const rows = await rpcRows(
    "get_tenant_position_competencies_v1",
    { p_company_id: companyId, p_position_id: positionId },
    z.array(competencySchema)
  )
  return rows.map((row) => ({
    id: row.position_competency_id,
    company_id: companyId,
    position_id: row.position_id,
    competency_id: row.competency_id,
    expected_level: row.expected_level,
    weight: row.weight,
    required: row.required,
    type: row.competency_type,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    archived_at: null,
    competencies: { name: row.competency_name },
  }))
}

export async function getManagementEntityTimeline(
  companyId: string,
  entityType: "department" | "team" | "position" | "person",
  entityId: string,
  limit = 20
) {
  const rows = await rpcRows(
    "get_tenant_entity_activity_timeline_v1",
    {
      p_company_id: companyId,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_limit: limit,
    },
    z.array(activitySchema)
  )
  return {
    items: rows.map((row) => ({
      id: row.activity_id,
      companyId,
      activityType: row.activity_type,
      module: row.module,
      title: row.title,
      description: row.description,
      actorType:
        row.actor_type as ActivityTimelineItemViewModel["actorType"],
      actorId: null,
      entityType: row.entity_type,
      entityId: row.entity_id,
      subjectType: null,
      subjectId: null,
      visibility: "company" as const,
      metadata: {},
      occurredAt: row.occurred_at,
      createdAt: row.created_at,
    })),
    hasMore: false,
    nextCursor: null,
  }
}

export async function getManagementCompanyTimeline(
  companyId: string,
  limit = 20
) {
  const database = await createServerDatabase()
  const rows = await createTenantDashboardReadRepository(
    database
  ).loadActivity(companyId, limit)
  return {
    items: rows.map((row) => ({
      id: row.activity_id,
      companyId,
      activityType: row.activity_type,
      module: row.module,
      title: row.title,
      description: row.description,
      actorType:
        row.actor_type as ActivityTimelineItemViewModel["actorType"],
      actorId: row.actor_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      visibility:
        row.visibility as ActivityTimelineItemViewModel["visibility"],
      metadata:
        row.metadata as ActivityTimelineItemViewModel["metadata"],
      occurredAt: row.occurred_at,
      createdAt: row.created_at,
    })),
    hasMore: false,
    nextCursor: null,
  }
}

import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

const uuid = z.string().uuid()
const nullableUuid = uuid.nullable()
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const timestamp = z.string().datetime({ offset: true })

const organizationRowSchema = z.object({
  entity_type: z.enum(["department", "team", "position"]),
  entity_id: uuid,
  name: z.string().min(1),
  status: z.string().nullable(),
  department_id: nullableUuid,
  parent_entity_id: nullableUuid,
}).strict().superRefine((row, context) => {
  const validPositionStatus = row.status === "active" || row.status === "inactive"
  if (
    (row.entity_type === "position" && !validPositionStatus)
    || (row.entity_type !== "position" && row.status !== null)
  ) {
    context.addIssue({ code: "custom", message: "Invalid organization row status" })
  }
})

const peopleRowSchema = z.object({
  person_id: uuid,
  full_name: z.string().min(1),
  status: z.enum(["active", "inactive", "on_leave"]),
  manager_id: nullableUuid,
  manager_name: z.string().nullable(),
  team_id: nullableUuid,
  team_name: z.string().nullable(),
  position_id: nullableUuid,
  position_name: z.string().nullable(),
}).strict()

const developmentRowSchema = z.object({
  record_type: z.enum(["plan", "goal", "action", "template"]),
  record_id: uuid,
  parent_id: nullableUuid,
  employee_id: nullableUuid,
  owner_id: nullableUuid,
  template_id: nullableUuid,
  competency_id: nullableUuid,
  label: z.string().min(1),
  status: z.string().nullable(),
  priority: z.string().nullable(),
  action_type: z.string().nullable(),
  current_level: z.number().int().nullable(),
  expected_level: z.number().int().nullable(),
  target_level: z.number().int().nullable(),
  start_date: date.nullable(),
  due_date: date.nullable(),
  completed_at: timestamp.nullable(),
  scope: z.string().nullable(),
  suggested_duration_days: z.number().int().nullable(),
}).strict().superRefine((row, context) => {
  const valid = row.record_type === "plan"
    ? row.employee_id !== null
      && ["draft", "active", "completed", "cancelled"].includes(row.status ?? "")
      && ["low", "medium", "high"].includes(row.priority ?? "")
    : row.record_type === "goal"
      ? row.parent_id !== null
        && row.competency_id !== null
        && row.current_level !== null
        && row.expected_level !== null
        && row.target_level !== null
        && ["not_started", "in_progress", "completed"].includes(row.status ?? "")
      : row.record_type === "action"
        ? row.parent_id !== null
          && ["pending", "in_progress", "completed", "skipped"].includes(row.status ?? "")
          && ["course", "book", "mentoring", "shadowing", "project", "workshop", "feedback", "other"]
            .includes(row.action_type ?? "")
        : row.scope === "global" || row.scope === "company"

  if (!valid) {
    context.addIssue({ code: "custom", message: "Invalid development row shape" })
  }
})

const competencyRowSchema = z.object({
  record_type: z.enum(["employee", "position"]),
  record_id: uuid,
  employee_id: nullableUuid,
  position_id: nullableUuid,
  competency_id: uuid,
  competency_name: z.string().min(1),
  current_level: z.number().int().nullable(),
  expected_level: z.number().int().nullable(),
  weight: z.coerce.number().nullable(),
  required: z.boolean().nullable(),
}).strict().superRefine((row, context) => {
  const valid = row.record_type === "employee"
    ? row.employee_id !== null && row.position_id === null && row.current_level !== null
    : row.employee_id === null
      && row.position_id !== null
      && row.expected_level !== null
      && row.weight !== null
      && row.required !== null

  if (!valid) {
    context.addIssue({ code: "custom", message: "Invalid competency row shape" })
  }
})

const recruitmentRowSchema = z.object({
  job_opening_id: uuid,
  title: z.string().min(1),
  status: z.enum([
    "draft", "pending_approval", "approved", "open", "paused", "closed",
    "cancelled", "filled",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  department_id: uuid,
  position_id: uuid,
  requesting_manager_id: uuid,
  recruiter_id: nullableUuid,
  target_hire_date: date.nullable(),
  updated_at: timestamp,
}).strict()

const activityRowSchema = z.object({
  activity_id: uuid,
  activity_type: z.string().min(1),
  module: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  actor_type: z.string().min(1),
  actor_id: nullableUuid,
  entity_type: z.string().nullable(),
  entity_id: nullableUuid,
  subject_type: z.string().nullable(),
  subject_id: nullableUuid,
  visibility: z.string().min(1),
  metadata: z.unknown(),
  occurred_at: timestamp,
  created_at: timestamp,
}).strict()

const responseSchemas = {
  organization: z.array(organizationRowSchema),
  people: z.array(peopleRowSchema),
  development: z.array(developmentRowSchema),
  competencies: z.array(competencyRowSchema),
  recruitment: z.array(recruitmentRowSchema),
  activity: z.array(activityRowSchema),
} as const

export type TenantOrganizationDirectoryRow = z.infer<typeof organizationRowSchema>
export type TenantPeopleDirectoryRow = z.infer<typeof peopleRowSchema>
export type TenantDevelopmentDashboardRow = z.infer<typeof developmentRowSchema>
export type TenantCompetencyDirectoryRow = z.infer<typeof competencyRowSchema>
export type TenantRecruitmentJobOpeningRow = z.infer<typeof recruitmentRowSchema>
export type TenantActivityTimelineRow = z.infer<typeof activityRowSchema>

export type TenantDashboardReadRows = Readonly<{
  organization: readonly TenantOrganizationDirectoryRow[]
  people: readonly TenantPeopleDirectoryRow[]
  development: readonly TenantDevelopmentDashboardRow[]
  competencies: readonly TenantCompetencyDirectoryRow[]
  recruitment: readonly TenantRecruitmentJobOpeningRow[]
  activity: readonly TenantActivityTimelineRow[]
}>

export class TenantDashboardReadError extends Error {
  constructor(readonly code: "read_failed" | "invalid_response") {
    super("Não foi possível carregar o dashboard.")
    this.name = "TenantDashboardReadError"
  }
}

function parseResponse<Output>(
  schema: z.ZodType<Output>,
  payload: unknown,
): Output {
  const parsed = schema.safeParse(payload)

  if (!parsed.success) {
    throw new TenantDashboardReadError("invalid_response")
  }

  return parsed.data
}

export function createTenantDashboardReadRepository(supabase: SupabaseClient) {
  return {
    async load(companyId: string, activityLimit = 20): Promise<TenantDashboardReadRows> {
      let responses: readonly Readonly<{ data: unknown; error: unknown }>[]

      try {
        responses = await Promise.all([
          supabase.rpc("get_tenant_organization_directory_v1", { p_company_id: companyId }),
          supabase.rpc("get_tenant_people_directory_v1", { p_company_id: companyId }),
          supabase.rpc("get_tenant_development_dashboard_v1", { p_company_id: companyId }),
          supabase.rpc("get_tenant_competency_directory_v1", { p_company_id: companyId }),
          supabase.rpc("get_tenant_recruitment_job_openings_v1", { p_company_id: companyId }),
          supabase.rpc("get_tenant_activity_timeline_v1", {
            p_company_id: companyId,
            p_limit: activityLimit,
          }),
        ])
      } catch {
        throw new TenantDashboardReadError("read_failed")
      }

      if (responses.some((response) => response.error)) {
        throw new TenantDashboardReadError("read_failed")
      }

      return Object.freeze({
        organization: parseResponse(responseSchemas.organization, responses[0].data),
        people: parseResponse(responseSchemas.people, responses[1].data),
        development: parseResponse(responseSchemas.development, responses[2].data),
        competencies: parseResponse(responseSchemas.competencies, responses[3].data),
        recruitment: parseResponse(responseSchemas.recruitment, responses[4].data),
        activity: parseResponse(responseSchemas.activity, responses[5].data),
      })
    },
  }
}

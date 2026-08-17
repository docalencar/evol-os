import "server-only"

import { z } from "zod"

import { createServerDatabase } from "@/lib/database/server-database"

const uuid = z.string().uuid()
const nullableUuid = uuid.nullable()
const text = z.string()
const nullableText = text.nullable()
const timestamp = z.string().datetime({ offset: true })
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()

const competencySchema = z.object({ competency_id: uuid, name: text.min(1), description: nullableText,
  category: z.enum(["behavioral", "technical", "leadership"]), expected_level: z.number().int(),
  weight: z.number().int(), active: z.boolean(), created_at: timestamp, updated_at: timestamp }).strict()
const planSchema = z.object({ plan_id: uuid, employee_id: uuid, owner_id: nullableUuid, template_id: nullableUuid,
  title: text.min(1), description: nullableText, status: z.enum(["draft", "active", "completed", "cancelled"]),
  priority: z.enum(["low", "medium", "high"]), start_date: date, due_date: date,
  completed_at: timestamp.nullable(), created_at: timestamp, updated_at: timestamp }).strict()
const goalSchema = z.object({ goal_id: uuid, plan_id: uuid, competency_id: uuid, title: text.min(1),
  description: nullableText, current_level: z.number().int(), expected_level: z.number().int(),
  target_level: z.number().int(), status: z.enum(["not_started", "in_progress", "completed"]),
  created_at: timestamp, updated_at: timestamp }).strict()
const actionSchema = z.object({ action_id: uuid, goal_id: uuid, plan_id: uuid, title: text.min(1),
  description: nullableText, action_type: z.enum(["course", "book", "mentoring", "shadowing", "project", "workshop", "feedback", "other"]),
  status: z.enum(["pending", "in_progress", "completed", "skipped"]), due_date: date,
  completed_at: timestamp.nullable(), created_at: timestamp, updated_at: timestamp }).strict()
const templateSchema = z.object({ template_id: uuid, name: text.min(1), description: nullableText,
  scope: z.enum(["global", "company"]), suggested_duration_days: z.number().int().nullable(), active: z.boolean(),
  created_at: timestamp, updated_at: timestamp }).strict()
const templateGoalSchema = z.object({ template_goal_id: uuid, template_id: uuid, competency_id: nullableUuid,
  competency_name: nullableText, description: nullableText, suggested_target_level: z.number().int().nullable(),
  order_index: z.number().int(), created_at: timestamp, updated_at: timestamp }).strict()
const templateActionSchema = z.object({ template_action_id: uuid, template_goal_id: uuid, title: text.min(1),
  description: nullableText, action_type: actionSchema.shape.action_type, suggested_due_days: z.number().int().nullable(),
  order_index: z.number().int(), created_at: timestamp, updated_at: timestamp }).strict()
const assignmentSchema = z.object({ record_type: z.enum(["employee", "position"]), record_id: uuid,
  employee_id: nullableUuid, position_id: nullableUuid, competency_id: uuid, competency_name: text.min(1),
  current_level: z.number().int().nullable(), expected_level: z.number().int().nullable(),
  weight: z.coerce.number().nullable(), required: z.boolean().nullable() }).strict()

export class CompetencyDevelopmentReadError extends Error {
  constructor() { super("Não foi possível carregar os dados desta página."); this.name = "CompetencyDevelopmentReadError" }
}

async function rows<T>(rpc: string, params: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
  const database = await createServerDatabase()
  try {
    const { data, error } = await database.rpc(rpc, params)
    if (error) throw new CompetencyDevelopmentReadError()
    const parsed = schema.safeParse(data)
    if (!parsed.success) throw new CompetencyDevelopmentReadError()
    return parsed.data
  } catch (error) {
    if (error instanceof CompetencyDevelopmentReadError) throw error
    throw new CompetencyDevelopmentReadError()
  }
}

export async function getManagementCompetencies(companyId: string) {
  const data = await rows("get_tenant_competencies_management_v1", { p_company_id: companyId }, z.array(competencySchema))
  return data.map((r) => ({ id: r.competency_id, company_id: companyId, name: r.name, description: r.description,
    category: r.category, expected_level: r.expected_level, weight: r.weight, active: r.active,
    created_at: r.created_at, updated_at: r.updated_at }))
}

export async function getManagementDevelopmentPlans(companyId: string, planId: string | null = null) {
  const data = await rows("get_tenant_development_plans_management_v1", { p_company_id: companyId, p_plan_id: planId }, z.array(planSchema))
  return data.map((r) => ({ id: r.plan_id, companyId, employeeId: r.employee_id, ownerId: r.owner_id,
    templateId: r.template_id, title: r.title, description: r.description, status: r.status, priority: r.priority,
    startDate: r.start_date, dueDate: r.due_date, completedAt: r.completed_at, createdAt: r.created_at, updatedAt: r.updated_at }))
}

export async function getManagementDevelopmentGoals(companyId: string, planId: string | null = null) {
  const data = await rows("get_tenant_development_goals_management_v1", { p_company_id: companyId, p_plan_id: planId }, z.array(goalSchema))
  return data.map((r) => ({ id: r.goal_id, planId: r.plan_id, competencyId: r.competency_id, title: r.title,
    description: r.description, currentLevel: r.current_level, expectedLevel: r.expected_level,
    targetLevel: r.target_level, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at }))
}

export async function getManagementDevelopmentActions(companyId: string, planId: string | null = null) {
  const data = await rows("get_tenant_development_actions_management_v1", { p_company_id: companyId, p_plan_id: planId }, z.array(actionSchema))
  return data.map((r) => ({ id: r.action_id, goalId: r.goal_id, planId: r.plan_id, title: r.title,
    description: r.description, type: r.action_type, status: r.status, dueDate: r.due_date,
    completedAt: r.completed_at, createdAt: r.created_at, updatedAt: r.updated_at }))
}

export async function getManagementDevelopmentTemplates(companyId: string, templateId: string | null = null) {
  const data = await rows("get_tenant_development_templates_management_v1", { p_company_id: companyId, p_template_id: templateId }, z.array(templateSchema))
  return data.map((r) => ({ id: r.template_id, companyId: r.scope === "company" ? companyId : null,
    name: r.name, description: r.description, scope: r.scope, suggestedDurationDays: r.suggested_duration_days,
    active: r.active, createdAt: r.created_at, updatedAt: r.updated_at }))
}

export async function getManagementDevelopmentTemplateGoals(companyId: string, templateId: string) {
  const data = await rows("get_tenant_development_template_goals_v1", { p_company_id: companyId, p_template_id: templateId }, z.array(templateGoalSchema))
  return data.map((r) => ({ id: r.template_goal_id, templateId: r.template_id, competencyId: r.competency_id,
    competency_id: r.competency_id, competency_name: r.competency_name, description: r.description,
    suggestedTargetLevel: r.suggested_target_level, suggested_target_level: r.suggested_target_level,
    orderIndex: r.order_index, order_index: r.order_index, createdAt: r.created_at, updatedAt: r.updated_at,
    competencies: r.competency_name ? { name: r.competency_name } : null }))
}

export async function getManagementDevelopmentTemplateActions(companyId: string, templateId: string) {
  const data = await rows("get_tenant_development_template_actions_v1", { p_company_id: companyId, p_template_id: templateId }, z.array(templateActionSchema))
  return data.map((r) => ({ id: r.template_action_id, templateGoalId: r.template_goal_id, title: r.title,
    description: r.description, type: r.action_type, suggestedDueDays: r.suggested_due_days,
    orderIndex: r.order_index, createdAt: r.created_at, updatedAt: r.updated_at }))
}

export async function getManagementCompetencyAssignments(companyId: string) {
  return rows("get_tenant_competency_directory_v1", { p_company_id: companyId }, z.array(assignmentSchema))
}

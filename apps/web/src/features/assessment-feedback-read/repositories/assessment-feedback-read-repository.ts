import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

const uuid = z.string().uuid()
const nullableUuid = uuid.nullable()
const text = z.string()
const nullableText = text.nullable()
const timestamp = z.string().datetime({ offset: true })
const nullableTimestamp = timestamp.nullable()
const nullableDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()
const templateType = z.enum([
  "experience", "monthly", "quarterly", "semester", "annual", "360", "leadership",
])
const templateStatus = z.enum(["draft", "active", "archived"])
const cycleType = z.enum(["performance", "competency", "experience", "probation", "360", "custom"])
const cycleStatus = z.enum(["draft", "scheduled", "active", "completed", "cancelled"])
const visibility = z.enum(["none", "score", "score_and_competencies", "score_and_comments", "full"])
const responseStatus = z.enum(["draft", "in_progress", "submitted", "completed", "cancelled"])
const questionType = z.enum(["scale", "yes_no", "text", "number"])

const catalogRowSchema = z.object({
  record_type: z.enum(["template", "cycle"]), record_id: uuid, name: text.min(1),
  description: nullableText, instructions: nullableText,
  assessment_type: z.union([templateType, cycleType]).nullable(),
  status: z.union([templateStatus, cycleStatus]), active: z.boolean().nullable(), template_id: nullableUuid,
  start_date: nullableDate, end_date: nullableDate, close_date: nullableDate,
  allow_self_assessment: z.boolean().nullable(), allow_manager_assessment: z.boolean().nullable(),
  allow_peer_assessment: z.boolean().nullable(), allow_direct_report_assessment: z.boolean().nullable(),
  anonymous: z.boolean().nullable(), assessment_visibility: visibility.nullable(),
}).strict().superRefine((row, context) => {
  const valid = row.record_type === "template"
    ? row.active !== null && templateType.safeParse(row.assessment_type).success
      && templateStatus.safeParse(row.status).success
    : row.template_id !== null && row.start_date !== null && row.end_date !== null
      && row.allow_self_assessment !== null && row.allow_manager_assessment !== null
      && row.allow_peer_assessment !== null && row.allow_direct_report_assessment !== null
      && row.anonymous !== null && row.assessment_visibility !== null
      && cycleType.safeParse(row.assessment_type).success
      && cycleStatus.safeParse(row.status).success
  if (!valid) context.addIssue({ code: "custom", message: "Invalid assessment catalog row" })
})

const structureRowSchema = z.object({
  record_type: z.enum(["template", "section", "question"]), record_id: uuid,
  parent_id: nullableUuid, name: nullableText, description: nullableText, instructions: nullableText,
  assessment_type: nullableText, status: nullableText, icon: nullableText, color: nullableText,
  weight: z.coerce.number().nullable(), display_order: z.number().int().nullable(), question: nullableText,
  help_text: nullableText, question_type: questionType.nullable(), scale_min: z.number().int().nullable(),
  scale_max: z.number().int().nullable(), required: z.boolean().nullable(), active: z.boolean(),
}).strict().superRefine((row, context) => {
  const valid = row.record_type === "template"
    ? row.name !== null && row.assessment_type !== null && row.status !== null
    : row.record_type === "section"
      ? row.parent_id !== null && row.name !== null && row.weight !== null && row.display_order !== null
      : row.parent_id !== null && row.weight !== null && row.display_order !== null
        && row.question !== null && row.question_type !== null && row.scale_min !== null
        && row.scale_max !== null && row.required !== null
  if (!valid) context.addIssue({ code: "custom", message: "Invalid assessment structure row" })
})

const cycleRowSchema = z.object({
  record_type: z.enum(["cycle", "participant"]), record_id: uuid, person_id: nullableUuid,
  full_name: nullableText, email: nullableText, name: nullableText, description: nullableText,
  assessment_type: cycleType.nullable(), status: cycleStatus.nullable(), template_id: nullableUuid,
  start_date: nullableDate, end_date: nullableDate, close_date: nullableDate,
  allow_self_assessment: z.boolean().nullable(), allow_manager_assessment: z.boolean().nullable(),
  allow_peer_assessment: z.boolean().nullable(), allow_direct_report_assessment: z.boolean().nullable(),
  anonymous: z.boolean().nullable(), assessment_visibility: visibility.nullable(), created_at: timestamp,
}).strict().superRefine((row, context) => {
  const valid = row.record_type === "cycle"
    ? row.name !== null && row.assessment_type !== null && row.status !== null && row.template_id !== null
      && row.start_date !== null && row.end_date !== null && row.allow_self_assessment !== null
      && row.allow_manager_assessment !== null && row.allow_peer_assessment !== null
      && row.allow_direct_report_assessment !== null && row.anonymous !== null
      && row.assessment_visibility !== null
    : row.person_id !== null && row.full_name !== null
  if (!valid) context.addIssue({ code: "custom", message: "Invalid assessment cycle row" })
})

const workspaceRowSchema = z.object({
  record_type: z.enum(["response", "template", "section", "question"]), record_id: uuid,
  parent_id: nullableUuid, template_id: nullableUuid, cycle_id: nullableUuid, employee_id: nullableUuid,
  evaluator_id: nullableUuid, status: z.union([responseStatus, templateStatus]).nullable(), name: nullableText, description: nullableText,
  instructions: nullableText, assessment_type: templateType.nullable(), icon: nullableText, color: nullableText,
  weight: z.coerce.number().nullable(), display_order: z.number().int().nullable(), question: nullableText,
  help_text: nullableText, question_type: questionType.nullable(), scale_min: z.number().int().nullable(),
  scale_max: z.number().int().nullable(), required: z.boolean().nullable(), active: z.boolean().nullable(),
  started_at: nullableTimestamp, completed_at: nullableTimestamp, submitted_at: nullableTimestamp,
}).strict().superRefine((row, context) => {
  const valid = row.record_type === "response"
    ? row.template_id !== null && row.cycle_id !== null && row.employee_id !== null
      && row.evaluator_id !== null && responseStatus.safeParse(row.status).success
    : row.record_type === "template"
      ? row.template_id !== null && row.name !== null && row.status !== null
        && templateStatus.safeParse(row.status).success
        && row.assessment_type !== null && row.active !== null
      : row.record_type === "section"
        ? row.parent_id !== null && row.name !== null && row.weight !== null
          && row.display_order !== null && row.active !== null
        : row.parent_id !== null && row.question !== null && row.question_type !== null
          && row.weight !== null && row.display_order !== null && row.scale_min !== null
          && row.scale_max !== null && row.required !== null && row.active !== null
  if (!valid) context.addIssue({ code: "custom", message: "Invalid evaluator workspace row" })
})

const feedbackDirectoryRowSchema = z.object({
  thread_id: uuid, sender_person_id: uuid, receiver_person_id: uuid,
  sender_name: text.min(1), receiver_name: text.min(1), title: text.min(1),
  thread_type: z.enum(["feedback", "feedforward", "recognition", "check_in", "one_on_one"]),
  priority: z.enum(["low", "normal", "high"]),
  status: z.enum(["open", "awaiting_acknowledgement", "acknowledged", "closed", "archived"]),
  updated_at: timestamp,
}).strict()
const feedbackDetailRowSchema = feedbackDirectoryRowSchema.omit({ updated_at: true }).extend({
  visibility: z.enum(["participants", "management", "hr"]), requires_follow_up: z.boolean(),
  follow_up_at: nullableTimestamp, acknowledged_at: nullableTimestamp, closed_at: nullableTimestamp,
  created_at: timestamp, updated_at: timestamp,
}).strict()
const feedbackMessageRowSchema = z.object({
  message_id: uuid, author_person_id: nullableUuid, author_name: nullableText,
  message_type: z.enum(["message", "summary", "system"]), content: text,
  edited_at: nullableTimestamp, created_at: timestamp,
}).strict()

export class AssessmentFeedbackReadError extends Error {
  constructor() {
    super("Não foi possível carregar os dados desta página.")
    this.name = "AssessmentFeedbackReadError"
  }
}

type RpcDatabase = Pick<SupabaseClient, "rpc">

async function rpcRows<T>(database: RpcDatabase, name: string, parameters: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
  try {
    const { data, error } = await database.rpc(name, parameters)
    if (error) throw new AssessmentFeedbackReadError()
    const parsed = schema.safeParse(data)
    if (!parsed.success) throw new AssessmentFeedbackReadError()
    return parsed.data
  } catch (error) {
    if (error instanceof AssessmentFeedbackReadError) throw error
    throw new AssessmentFeedbackReadError()
  }
}

export function createAssessmentFeedbackReadRepository(database: RpcDatabase) {
  return {
    assessmentCatalog: (companyId: string) => rpcRows(database, "get_tenant_assessment_catalog_v1", { p_company_id: companyId }, z.array(catalogRowSchema)),
    assessmentStructure: (companyId: string, templateId: string) => rpcRows(database, "get_tenant_assessment_template_structure_v1", { p_company_id: companyId, p_template_id: templateId }, z.array(structureRowSchema)),
    assessmentCycle: (companyId: string, cycleId: string) => rpcRows(database, "get_tenant_assessment_cycle_management_v1", { p_company_id: companyId, p_cycle_id: cycleId }, z.array(cycleRowSchema)),
    evaluatorWorkspace: (companyId: string, responseId: string) => rpcRows(database, "get_assessment_evaluator_workspace_v1", { p_company_id: companyId, p_response_id: responseId }, z.array(workspaceRowSchema)),
    feedbackDirectory: (companyId: string) => rpcRows(database, "get_current_person_feedback_threads_v1", { p_company_id: companyId }, z.array(feedbackDirectoryRowSchema)),
    feedbackDetail: (companyId: string, threadId: string) => rpcRows(database, "get_feedback_thread_detail_v1", { p_company_id: companyId, p_thread_id: threadId }, z.array(feedbackDetailRowSchema)),
    feedbackMessages: (companyId: string, threadId: string) => rpcRows(database, "get_feedback_thread_messages_v1", { p_company_id: companyId, p_thread_id: threadId }, z.array(feedbackMessageRowSchema)),
  }
}

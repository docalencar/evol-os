import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import type { AssessmentCycle } from "@/features/assessments/types/assessment-cycle"
import type { AssessmentAnswer } from "@/features/assessments/types/assessment-answer"
import type { AssessmentQuestion } from "@/features/assessments/types/assessment-question"
import type { AssessmentResponse } from "@/features/assessments/types/assessment-response"
import type { AssessmentSection } from "@/features/assessments/types/assessment-section"
import type { AssessmentTemplate } from "@/features/assessments/types/assessment-template"
import { loadAssessmentActor } from "@/features/assessments/application/load-assessment-actor"
import { isAdministrativeRole } from "@/features/authorization"
import type {
  FeedbackMessageDetail,
  FeedbackThreadDetail,
  FeedbackThreadListItem,
} from "@/features/feedbacks/types/feedback"
import { readAssessmentAdministratively } from "@/features/assessments/application/assessment-administrative-read-service"
import { getAssessmentAnswers } from "@/features/assessments/queries/get-assessment-answers"

import {
  AssessmentFeedbackReadError,
  createAssessmentFeedbackReadRepository,
} from "../repositories/assessment-feedback-read-repository"

async function repository() {
  return createAssessmentFeedbackReadRepository(await createServerDatabase())
}

export async function getAssessmentCatalogReadModel(companyId: string): Promise<{
  templates: AssessmentTemplate[]
  cycles: AssessmentCycle[]
}> {
  const rows = await (await repository()).assessmentCatalog(companyId)
  return {
    templates: rows.filter((row) => row.record_type === "template").map((row) => ({
      id: row.record_id, company_id: companyId, name: row.name, description: row.description,
      instructions: row.instructions, type: row.assessment_type as AssessmentTemplate["type"],
      status: row.status as AssessmentTemplate["status"], active: row.active!,
    })),
    cycles: rows.filter((row) => row.record_type === "cycle").map((row) => ({
      id: row.record_id, company_id: companyId, name: row.name, description: row.description,
      assessment_type: row.assessment_type as AssessmentCycle["assessment_type"],
      status: row.status as AssessmentCycle["status"], assessment_template_id: row.template_id,
      start_date: row.start_date!, end_date: row.end_date!, close_date: row.close_date,
      allow_self_assessment: row.allow_self_assessment!, allow_manager_assessment: row.allow_manager_assessment!,
      allow_peer_assessment: row.allow_peer_assessment!,
      allow_direct_report_assessment: row.allow_direct_report_assessment!, anonymous: row.anonymous!,
      assessment_visibility: row.assessment_visibility as AssessmentCycle["assessment_visibility"],
    })),
  }
}

function mapStructure(companyId: string, rows: Awaited<ReturnType<ReturnType<typeof createAssessmentFeedbackReadRepository>["assessmentStructure"]>>) {
  const templateRow = rows.find((row) => row.record_type === "template")
  const template: AssessmentTemplate | null = templateRow ? {
    id: templateRow.record_id, company_id: companyId, name: templateRow.name!,
    description: templateRow.description, instructions: templateRow.instructions,
    type: templateRow.assessment_type as AssessmentTemplate["type"],
    status: templateRow.status as AssessmentTemplate["status"], active: templateRow.active,
  } : null
  const sections: AssessmentSection[] = rows.filter((row) => row.record_type === "section").map((row) => ({
    id: row.record_id, company_id: companyId, assessment_template_id: row.parent_id!, code: null,
    name: row.name!, description: row.description, icon: row.icon, color: row.color,
    weight: row.weight!, display_order: row.display_order!, active: row.active,
  }))
  const questions: AssessmentQuestion[] = rows.filter((row) => row.record_type === "question").map((row) => ({
    id: row.record_id, company_id: companyId, assessment_section_id: row.parent_id!, code: null,
    question: row.question!, help_text: row.help_text,
    question_type: row.question_type as AssessmentQuestion["question_type"],
    scale_min: row.scale_min!, scale_max: row.scale_max!, weight: row.weight!,
    display_order: row.display_order!, required: row.required!, active: row.active,
  }))
  return { template, sections, questions }
}

export async function getAssessmentTemplateStructureReadModel(companyId: string, templateId: string) {
  return mapStructure(companyId, await (await repository()).assessmentStructure(companyId, templateId))
}

export async function getAssessmentCycleReadModel(companyId: string, cycleId: string) {
  const rows = await (await repository()).assessmentCycle(companyId, cycleId)
  const cycleRow = rows.find((row) => row.record_type === "cycle")
  const cycle: AssessmentCycle | null = cycleRow ? {
    id: cycleRow.record_id, company_id: companyId, name: cycleRow.name!, description: cycleRow.description,
    assessment_type: cycleRow.assessment_type as AssessmentCycle["assessment_type"],
    status: cycleRow.status as AssessmentCycle["status"], assessment_template_id: cycleRow.template_id,
    start_date: cycleRow.start_date!, end_date: cycleRow.end_date!, close_date: cycleRow.close_date,
    allow_self_assessment: cycleRow.allow_self_assessment!,
    allow_manager_assessment: cycleRow.allow_manager_assessment!, allow_peer_assessment: cycleRow.allow_peer_assessment!,
    allow_direct_report_assessment: cycleRow.allow_direct_report_assessment!, anonymous: cycleRow.anonymous!,
    assessment_visibility: cycleRow.assessment_visibility as AssessmentCycle["assessment_visibility"],
    created_at: cycleRow.created_at,
  } : null
  const participants = rows.filter((row) => row.record_type === "participant").map((row) => ({
    id: row.record_id, employee_id: row.person_id!, people: {
      id: row.person_id!, full_name: row.full_name!, email: row.email,
    },
  }))
  return { cycle, participants }
}

export async function getAssessmentEvaluatorWorkspaceReadModel(companyId: string, responseId: string) {
  const rows = await (await repository()).evaluatorWorkspace(companyId, responseId)
  const responseRow = rows.find((row) => row.record_type === "response")
  if (!responseRow) return null
  const response: AssessmentResponse = {
    id: responseRow.record_id, company_id: companyId, assessment_cycle_id: responseRow.cycle_id!,
    assessment_template_id: responseRow.template_id!, employee_id: responseRow.employee_id!,
    evaluator_id: responseRow.evaluator_id!, status: responseRow.status as AssessmentResponse["status"],
    started_at: responseRow.started_at, completed_at: responseRow.completed_at,
    submitted_at: responseRow.submitted_at,
  }
  const structureRows = rows.filter((row) => row.record_type !== "response").map((row) => ({
    record_type: row.record_type as "template" | "section" | "question", record_id: row.record_id,
    parent_id: row.parent_id, name: row.name, description: row.description, instructions: row.instructions,
    assessment_type: row.assessment_type, status: row.status, icon: row.icon, color: row.color,
    weight: row.weight, display_order: row.display_order, question: row.question, help_text: row.help_text,
    question_type: row.question_type, scale_min: row.scale_min, scale_max: row.scale_max,
    required: row.required, active: row.active!,
  }))
  return { response, ...mapStructure(companyId, structureRows) }
}

export async function getAssessmentResponsePageReadModel(
  companyId: string,
  responseId: string
): Promise<{
  response: AssessmentResponse
  template: AssessmentTemplate
  sections: AssessmentSection[]
  questions: AssessmentQuestion[]
  answers: AssessmentAnswer[]
  mode: "evaluator" | "administrative"
} | null> {
  try {
    const actor = await loadAssessmentActor()
    if (actor.companyId !== companyId) return null

    if (!isAdministrativeRole(actor.role)) {
      const evaluatorWorkspace =
        await getAssessmentEvaluatorWorkspaceReadModel(companyId, responseId)
      if (!evaluatorWorkspace?.template) return null
      const answers = await getAssessmentAnswers(companyId, responseId)
      return {
        response: evaluatorWorkspace.response,
        template: evaluatorWorkspace.template,
        sections: evaluatorWorkspace.sections,
        questions: evaluatorWorkspace.questions,
        answers: answers ?? [],
        mode: "evaluator",
      }
    }

    const administrativeRead = await readAssessmentAdministratively(
      companyId,
      "response",
      responseId,
      "open_assessment_workspace"
    )
    const response = administrativeRead.responses[0]
    if (!response) return null

    const structure = await getAssessmentTemplateStructureReadModel(
      companyId,
      response.assessment_template_id
    )
    if (!structure.template) return null

    return {
      response,
      template: structure.template,
      sections: structure.sections,
      questions: structure.questions,
      answers: administrativeRead.answers,
      mode: "administrative",
    }
  } catch (error) {
    if (error instanceof AssessmentFeedbackReadError) throw error
    throw new AssessmentFeedbackReadError()
  }
}

export async function getFeedbackDirectoryReadModel(companyId: string): Promise<FeedbackThreadListItem[]> {
  const rows = await (await repository()).feedbackDirectory(companyId)
  return rows.map((row) => ({
    id: row.thread_id, senderEmployeeId: row.sender_person_id, receiverEmployeeId: row.receiver_person_id,
    senderName: row.sender_name, receiverName: row.receiver_name, title: row.title, type: row.thread_type,
    priority: row.priority, status: row.status, updatedAt: new Date(row.updated_at),
  }))
}

export async function getFeedbackThreadReadModel(companyId: string, threadId: string): Promise<{
  thread: FeedbackThreadDetail
  messages: FeedbackMessageDetail[]
} | null> {
  const repo = await repository()
  const [detailRows, messageRows] = await Promise.all([
    repo.feedbackDetail(companyId, threadId), repo.feedbackMessages(companyId, threadId),
  ])
  const row = detailRows[0]
  if (!row) return null
  return {
    thread: {
      id: row.thread_id, companyId, senderEmployeeId: row.sender_person_id,
      receiverEmployeeId: row.receiver_person_id, senderName: row.sender_name, receiverName: row.receiver_name,
      type: row.thread_type, status: row.status, priority: row.priority,
      visibility: row.visibility, title: row.title,
      requiresFollowUp: row.requires_follow_up,
      followUpAt: row.follow_up_at ? new Date(row.follow_up_at) : null,
      acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : null,
      closedAt: row.closed_at ? new Date(row.closed_at) : null,
      createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    },
    messages: messageRows.map((message) => ({
      id: message.message_id, companyId, threadId, authorEmployeeId: message.author_person_id,
      authorName: message.author_name, type: message.message_type, content: message.content,
      editedAt: message.edited_at ? new Date(message.edited_at) : null,
      createdAt: new Date(message.created_at),
    })),
  }
}

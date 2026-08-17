import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

import type { SupabaseClient } from "@supabase/supabase-js"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only"
      ? { shortCircuit: true, url: "server-only:test" }
      : nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    return url === "server-only:test"
      ? { format: "module", shortCircuit: true, source: "export {}" }
      : nextLoad(url, context)
  },
})

const repositoryModule = import("./assessment-feedback-read-repository")
const companyId = "11111111-1111-4111-8111-111111111111"
const recordId = "22222222-2222-4222-8222-222222222222"
const parentId = "33333333-3333-4333-8333-333333333333"
const timestamp = "2026-08-16T12:00:00+00:00"

function createDatabase(
  responseFor: (name: string) => Readonly<{ data: unknown; error: unknown }>,
) {
  const calls: Array<{ name: string; parameters: unknown }> = []
  const database = {
    rpc(name: string, parameters: unknown) {
      calls.push({ name, parameters })
      return Promise.resolve(responseFor(name))
    },
  } as unknown as SupabaseClient
  return { calls, database }
}

const catalogTemplate = {
  record_type: "template", record_id: recordId, name: "Avaliação anual",
  description: null, instructions: null, assessment_type: "annual", status: "active",
  active: true, template_id: null, start_date: null, end_date: null, close_date: null,
  allow_self_assessment: null, allow_manager_assessment: null, allow_peer_assessment: null,
  allow_direct_report_assessment: null, anonymous: null, assessment_visibility: null,
}

const structureTemplate = {
  record_type: "template", record_id: recordId, parent_id: null, name: "Avaliação anual",
  description: null, instructions: null, assessment_type: "annual", status: "active",
  icon: null, color: null, weight: null, display_order: null, question: null,
  help_text: null, question_type: null, scale_min: null, scale_max: null,
  required: null, active: true,
}

const cycle = {
  record_type: "cycle", record_id: recordId, person_id: null, full_name: null, email: null,
  name: "Ciclo 2026", description: null, assessment_type: "performance", status: "active",
  template_id: parentId, start_date: "2026-08-01", end_date: "2026-08-31", close_date: null,
  allow_self_assessment: true, allow_manager_assessment: true, allow_peer_assessment: false,
  allow_direct_report_assessment: false, anonymous: false, assessment_visibility: "full",
  created_at: timestamp,
}

const workspaceResponse = {
  record_type: "response", record_id: recordId, parent_id: null, template_id: parentId,
  cycle_id: parentId, employee_id: parentId, evaluator_id: parentId, status: "in_progress",
  name: null, description: null, instructions: null, assessment_type: null, icon: null,
  color: null, weight: null, display_order: null, question: null, help_text: null,
  question_type: null, scale_min: null, scale_max: null, required: null, active: false,
  started_at: timestamp, completed_at: null, submitted_at: null,
}

const feedbackDirectory = {
  thread_id: recordId, sender_person_id: parentId,
  receiver_person_id: "44444444-4444-4444-8444-444444444444",
  sender_name: "Pessoa A", receiver_name: "Pessoa B", title: "Conversa",
  thread_type: "feedback", priority: "normal", status: "open", updated_at: timestamp,
}

test("calls every 0088 boundary with the server-derived tenant selector", async () => {
  const { createAssessmentFeedbackReadRepository } = await repositoryModule
  const payloads: Record<string, unknown[]> = {
    get_tenant_assessment_catalog_v1: [catalogTemplate],
    get_tenant_assessment_template_structure_v1: [structureTemplate],
    get_tenant_assessment_cycle_management_v1: [cycle],
    get_assessment_evaluator_workspace_v1: [workspaceResponse],
    get_current_person_feedback_threads_v1: [feedbackDirectory],
    get_feedback_thread_detail_v1: [{
      ...feedbackDirectory, visibility: "participants", requires_follow_up: false,
      follow_up_at: null, acknowledged_at: null, closed_at: null, created_at: timestamp,
    }],
    get_feedback_thread_messages_v1: [{
      message_id: recordId, author_person_id: parentId, author_name: "Pessoa A",
      message_type: "message", content: "Conteúdo", edited_at: null, created_at: timestamp,
    }],
  }
  const { calls, database } = createDatabase((name) => ({ data: payloads[name], error: null }))
  const repository = createAssessmentFeedbackReadRepository(database)

  await repository.assessmentCatalog(companyId)
  await repository.assessmentStructure(companyId, recordId)
  await repository.assessmentCycle(companyId, recordId)
  await repository.evaluatorWorkspace(companyId, recordId)
  await repository.feedbackDirectory(companyId)
  await repository.feedbackDetail(companyId, recordId)
  await repository.feedbackMessages(companyId, recordId)

  assert.equal(calls.length, 7)
  assert.ok(calls.every((call) =>
    (call.parameters as { p_company_id?: string }).p_company_id === companyId
  ))
  assert.deepEqual(calls[1].parameters, { p_company_id: companyId, p_template_id: recordId })
  assert.deepEqual(calls[5].parameters, { p_company_id: companyId, p_thread_id: recordId })
})

test("accepts empty selectors and rejects malformed rows fail-closed", async () => {
  const { AssessmentFeedbackReadError, createAssessmentFeedbackReadRepository } =
    await repositoryModule
  const empty = createDatabase(() => ({ data: [], error: null }))
  await assert.doesNotReject(
    createAssessmentFeedbackReadRepository(empty.database).feedbackDetail(companyId, recordId)
  )

  const malformed = createDatabase(() => ({
    data: [{ ...feedbackDirectory, unexpected: "field" }], error: null,
  }))
  await assert.rejects(
    createAssessmentFeedbackReadRepository(malformed.database).feedbackDirectory(companyId),
    (error: unknown) => error instanceof AssessmentFeedbackReadError
      && error.message === "Não foi possível carregar os dados desta página.",
  )
})

test("sanitizes RPC authorization and PostgREST failures", async () => {
  const { AssessmentFeedbackReadError, createAssessmentFeedbackReadRepository } =
    await repositoryModule
  const failed = createDatabase(() => ({
    data: null,
    error: { code: "42501", message: "TENANT_AUTHORIZATION_DENIED", details: "secret" },
  }))

  await assert.rejects(
    createAssessmentFeedbackReadRepository(failed.database).assessmentCatalog(companyId),
    (error: unknown) => error instanceof AssessmentFeedbackReadError
      && !error.message.includes("42501")
      && !error.message.includes("TENANT_AUTHORIZATION_DENIED"),
  )
})

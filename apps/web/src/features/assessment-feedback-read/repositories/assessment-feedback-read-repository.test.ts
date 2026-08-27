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
  competency_id: null, competency_name: null,
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
  competency_id: null, competency_name: null,
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
    get_tenant_assessment_response_structure_v1: [structureTemplate],
    get_tenant_assessment_cycle_management_v1: [cycle],
    get_assessment_evaluator_workspace_v1: [workspaceResponse],
    get_current_person_assessment_result_directory_v1: [],
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
  await repository.assessmentResponseStructure(companyId, recordId)
  await repository.assessmentCycle(companyId, recordId)
  await repository.evaluatorWorkspace(companyId, recordId)
  await repository.currentPersonResultDirectory(companyId)
  await repository.feedbackDirectory(companyId)
  await repository.feedbackDetail(companyId, recordId)
  await repository.feedbackMessages(companyId, recordId)

  assert.equal(calls.length, 9)
  assert.ok(calls.every((call) =>
    (call.parameters as { p_company_id?: string }).p_company_id === companyId
  ))
  assert.deepEqual(calls[1].parameters, { p_company_id: companyId, p_template_id: recordId })
  assert.deepEqual(calls[2].parameters, { p_company_id: companyId, p_response_id: recordId })
  assert.deepEqual(calls[7].parameters, { p_company_id: companyId, p_thread_id: recordId })
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

test("result directory rejects evaluator identity and other unexpected fields", async () => {
  const { AssessmentFeedbackReadError, createAssessmentFeedbackReadRepository } =
    await repositoryModule
  const repository = createAssessmentFeedbackReadRepository({
    rpc: async () => ({
      data: [{
        cycle_id: "10000000-0000-4000-8000-000000000001",
        cycle_name: "Cycle",
        model_name: "Model",
        cycle_date: "2026-08-20",
        response_id: "20000000-0000-4000-8000-000000000001",
        perspective: "self",
        response_status: "submitted",
        submitted_at: "2026-08-21T12:00:00+00:00",
        completed_at: null,
        overall_score: 80,
        visibility: "full",
        result_available: true,
        evaluator_id: "30000000-0000-4000-8000-000000000001",
      }],
      error: null,
    }),
  } as never)

  await assert.rejects(
    repository.currentPersonResultDirectory("10000000-0000-4000-8000-000000000001"),
    AssessmentFeedbackReadError
  )
})

// --- Fronteira administrativa 0118 (directory de Results de uma Pessoa) ---

const personId = "55555555-5555-4555-8555-555555555555"

const personDirectoryRow = {
  cycle_id: "10000000-0000-4000-8000-000000000001",
  cycle_name: "Ciclo 2026",
  model_name: "Modelo Anual",
  cycle_date: "2026-08-20",
  response_id: "20000000-0000-4000-8000-000000000001",
  perspective: "manager",
  response_status: "submitted",
  submitted_at: "2026-08-21T12:00:00+00:00",
  completed_at: null,
  overall_score: 80,
}

test("0118 person directory parses the exact ten-column payload", async () => {
  const { createAssessmentFeedbackReadRepository } = await repositoryModule
  const { calls, database } = createDatabase(() => ({
    data: [personDirectoryRow],
    error: null,
  }))

  const rows = await createAssessmentFeedbackReadRepository(database)
    .personResultDirectory(companyId, personId)

  assert.deepEqual(rows, [personDirectoryRow])
  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, "get_tenant_person_assessment_result_directory_v1")
  assert.deepEqual(calls[0].parameters, {
    p_company_id: companyId,
    p_person_id: personId,
  })
})

test("0118 person directory does not require the 0117-only fields", async () => {
  // Regressão do defeito que o discovery apontou: reaproveitar o schema do
  // directory do avaliado (0117) faria o `safeParse` exigir `visibility` e
  // `result_available`, que a 0118 não retorna — e o erro de parsing se
  // disfarçaria de falta de permissão.
  const { createAssessmentFeedbackReadRepository } = await repositoryModule
  assert.equal("visibility" in personDirectoryRow, false)
  assert.equal("result_available" in personDirectoryRow, false)

  const { database } = createDatabase(() => ({ data: [personDirectoryRow], error: null }))
  await assert.doesNotReject(
    createAssessmentFeedbackReadRepository(database)
      .personResultDirectory(companyId, personId)
  )
})

test("0118 person directory rejects a 0117-shaped row", async () => {
  // O inverso da asserção anterior: os dois contratos não são intercambiáveis.
  const { AssessmentFeedbackReadError, createAssessmentFeedbackReadRepository } =
    await repositoryModule
  const { database } = createDatabase(() => ({
    data: [{ ...personDirectoryRow, visibility: "full", result_available: true }],
    error: null,
  }))

  await assert.rejects(
    createAssessmentFeedbackReadRepository(database)
      .personResultDirectory(companyId, personId),
    AssessmentFeedbackReadError
  )
})

test("0118 person directory rejects evaluator identity and raw score", async () => {
  const { AssessmentFeedbackReadError, createAssessmentFeedbackReadRepository } =
    await repositoryModule

  for (const leak of [
    { evaluator_id: "30000000-0000-4000-8000-000000000001" },
    { raw_score: 4 },
    { answers: [] },
  ]) {
    const { database } = createDatabase(() => ({
      data: [{ ...personDirectoryRow, ...leak }],
      error: null,
    }))
    await assert.rejects(
      createAssessmentFeedbackReadRepository(database)
        .personResultDirectory(companyId, personId),
      AssessmentFeedbackReadError
    )
  }
})

test("0118 person directory keeps numeric coercion and qualitative NULL", async () => {
  const { createAssessmentFeedbackReadRepository } = await repositoryModule
  const { database } = createDatabase(() => ({
    data: [
      { ...personDirectoryRow, overall_score: "66.666667" },
      {
        ...personDirectoryRow,
        response_id: "20000000-0000-4000-8000-000000000002",
        overall_score: null,
      },
    ],
    error: null,
  }))

  const rows = await createAssessmentFeedbackReadRepository(database)
    .personResultDirectory(companyId, personId)

  // PostgREST entrega `numeric` como string; a coerção não pode transformar
  // ausência de nota em zero.
  assert.equal(rows[0].overall_score, 66.666667)
  assert.equal(rows[1].overall_score, null)
})

// --- Fronteira 0119 (agregado anônimo de direct_report de uma Pessoa) ---

const directReportAggregateRow = {
  cycle_id: "10000000-0000-4000-8000-000000000001",
  cycle_name: "Ciclo 2026",
  model_name: "Modelo Anual",
  cycle_date: "2026-08-20",
  aggregate_score: 80,
  is_qualitative: false,
  suppressed: false,
}

test("0119 direct-report aggregate parses the exact seven-column payload", async () => {
  const { createAssessmentFeedbackReadRepository } = await repositoryModule
  const { calls, database } = createDatabase(() => ({
    data: [directReportAggregateRow],
    error: null,
  }))

  const rows = await createAssessmentFeedbackReadRepository(database)
    .personDirectReportAggregate(companyId, personId)

  assert.deepEqual(rows, [directReportAggregateRow])
  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, "get_tenant_person_direct_report_aggregate_v1")
  assert.deepEqual(calls[0].parameters, {
    p_company_id: companyId,
    p_person_id: personId,
  })
})

test("0119 aggregate rejects cardinality, evaluator and raw-score leaks", async () => {
  // `.strict()` recusa qualquer coluna fora das 7 contratadas — o contrato
  // anônimo não pode readmitir nenhuma chave de reidentificação.
  const { AssessmentFeedbackReadError, createAssessmentFeedbackReadRepository } =
    await repositoryModule

  for (const leak of [
    { respondent_count: 4 },
    { scored_count: 4 },
    { response_id: "20000000-0000-4000-8000-000000000001" },
    { evaluator_id: "30000000-0000-4000-8000-000000000001" },
    { raw_score: 8 },
    { min_score: 1 },
    { max_score: 10 },
  ]) {
    const { database } = createDatabase(() => ({
      data: [{ ...directReportAggregateRow, ...leak }],
      error: null,
    }))
    await assert.rejects(
      createAssessmentFeedbackReadRepository(database)
        .personDirectReportAggregate(companyId, personId),
      AssessmentFeedbackReadError
    )
  }
})

test("0119 aggregate and the 0118 directory are not interchangeable", async () => {
  // Um payload do directory individual (com response_id/perspective) não pode
  // atravessar o schema agregado, e vice-versa; senão um erro de parsing se
  // disfarçaria de outro estado.
  const { AssessmentFeedbackReadError, createAssessmentFeedbackReadRepository } =
    await repositoryModule
  const { database } = createDatabase(() => ({
    data: [personDirectoryRow],
    error: null,
  }))

  await assert.rejects(
    createAssessmentFeedbackReadRepository(database)
      .personDirectReportAggregate(companyId, personId),
    AssessmentFeedbackReadError
  )
})

test("0119 aggregate coerces numeric score and never turns qualitative NULL into zero", async () => {
  const { createAssessmentFeedbackReadRepository } = await repositoryModule
  const { database } = createDatabase(() => ({
    data: [
      // quantitative: PostgREST entrega `numeric` como string
      { ...directReportAggregateRow, aggregate_score: "72.5" },
      // qualitative: score ausente permanece NULL
      {
        ...directReportAggregateRow,
        cycle_id: "10000000-0000-4000-8000-000000000002",
        aggregate_score: null,
        is_qualitative: true,
      },
      // suppressed: indistinguível de A — sem score, sem qualitativo
      {
        ...directReportAggregateRow,
        cycle_id: "10000000-0000-4000-8000-000000000003",
        aggregate_score: null,
        is_qualitative: false,
        suppressed: true,
      },
    ],
    error: null,
  }))

  const rows = await createAssessmentFeedbackReadRepository(database)
    .personDirectReportAggregate(companyId, personId)

  assert.equal(rows[0].aggregate_score, 72.5)
  assert.equal(rows[1].aggregate_score, null)
  assert.equal(rows[1].is_qualitative, true)
  assert.equal(rows[2].aggregate_score, null)
  assert.equal(rows[2].is_qualitative, false)
  assert.equal(rows[2].suppressed, true)
})

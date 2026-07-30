import assert from "node:assert/strict"
import test from "node:test"

import {
  KPIHistoryQueryService,
  createSupabaseKPIEvaluationRepositoryAdapter,
  toKPIEvaluationDTO,
} from ".."
import { evaluation, february, january } from "./kpi-test-fixtures"
import { ScriptedKPIDatabase } from "./supabase-kpi-test-database"

const companyId = "11111111-1111-4111-8111-111111111111"

test("Supabase evaluation repository persiste avaliação e snapshot em uma RPC", async () => {
  const database = new ScriptedKPIDatabase()
  database.enqueueRpc()
  const repository = createSupabaseKPIEvaluationRepositoryAdapter(database)
  await repository.save(evaluation({ company: companyId }))

  const call = database.calls.find((item) => item.operation === "rpc")
  assert.equal(call?.args[0], "persist_kpi_evaluation")
  const parameters = requireRecord(call?.args[1])
  assert.equal(requireRecord(parameters.p_evaluation).companyId, companyId)
  assert.equal(requireRecord(parameters.p_definition_snapshot).key, "test.metric")
})

test("busca avaliação por ID sempre com companyId", async () => {
  const database = new ScriptedKPIDatabase()
  database.enqueueQuery(persistedRow())
  const repository = createSupabaseKPIEvaluationRepositoryAdapter(database)
  const restored = await repository.findById(companyId, "evaluation-1")

  assert.equal(restored?.id, "evaluation-1")
  assert.equal(restored?.context.companyId, companyId)
  assert.deepEqual(eqCalls(database), [
    ["company_id", companyId],
    ["id", "evaluation-1"],
  ])
})

test("reidrata snapshot histórico completo e independente", async () => {
  const row = persistedRow()
  const snapshot = requireRecord(requireRecord(row).kpi_evaluation_snapshots)
  const definition = requireRecord(snapshot.definition_snapshot)
  definition.name = "Nome persistido"
  const database = new ScriptedKPIDatabase()
  database.enqueueQuery(row)
  const repository = createSupabaseKPIEvaluationRepositoryAdapter(database)
  const restored = await repository.findById(companyId, "evaluation-1")

  definition.name = "Mutado depois"
  assert.equal(restored?.definition.name, "Nome persistido")
  assert.equal("calculate" in (restored?.definition ?? {}), false)
})

test("lista por empresa com ordenação e paginação", async () => {
  const database = new ScriptedKPIDatabase()
  database.enqueueQuery([persistedRow()])
  const repository = createSupabaseKPIEvaluationRepositoryAdapter(database)
  assert.equal((await repository.listByCompany({ companyId, limit: 10, offset: 5 })).length, 1)
  assert.equal(database.calls.some((call) => call.operation === "range" && call.args[0] === 5 && call.args[1] === 14), true)
  assert.equal(database.calls.filter((call) => call.operation === "order").length, 2)
})

test("lista por definição, versão e período", async () => {
  const database = new ScriptedKPIDatabase()
  database.enqueueQuery([persistedRow()])
  const repository = createSupabaseKPIEvaluationRepositoryAdapter(database)
  await repository.listByDefinition({
    companyId,
    definitionKey: "test.metric",
    definitionVersion: 1,
    periodStart: january,
    periodEnd: february,
  })
  assert.equal(database.calls.some((call) => call.operation === "gte"), true)
  assert.equal(database.calls.some((call) => call.operation === "lte"), true)
  assert.equal(eqCalls(database).some(([column]) => column === "definition_version"), true)
})

test("lista por escopo preservando isolamento e filtros", async () => {
  const database = new ScriptedKPIDatabase()
  database.enqueueQuery([persistedRow()])
  const repository = createSupabaseKPIEvaluationRepositoryAdapter(database)
  await repository.listByScope({
    companyId,
    scopeType: "team",
    scopeId: "team-1",
    definitionKey: "test.metric",
  })
  assert.equal(eqCalls(database).some(([column, value]) => column === "scope_id" && value === "team-1"), true)
})

test("history oferece período, últimas avaliações e DTO específico", async () => {
  const database = new ScriptedKPIDatabase()
  database.enqueueQuery([persistedRow()])
  database.enqueueQuery([persistedRow()])
  const repository = createSupabaseKPIEvaluationRepositoryAdapter(database)
  const history = new KPIHistoryQueryService(repository)
  const byPeriod = await history.listByPeriod({ companyId, periodStart: january, periodEnd: february })
  const latest = await history.listLatest({ companyId, definitionKey: "test.metric", limit: 1 })
  assert.equal(byPeriod[0]?.definitionKey, "test.metric")
  assert.equal(latest[0]?.value, 10)
  assert.equal(database.calls.some((call) => call.operation === "limit" && call.args[0] === 1), true)
})

test("propaga falhas e rejeita dados persistidos inválidos", async () => {
  const failingDatabase = new ScriptedKPIDatabase()
  failingDatabase.enqueueQuery(null, { message: "query failure" })
  await assert.rejects(
    createSupabaseKPIEvaluationRepositoryAdapter(failingDatabase).findById(companyId, "id"),
    /query failure/
  )

  const invalidDatabase = new ScriptedKPIDatabase()
  invalidDatabase.enqueueQuery({ id: "incomplete" })
  await assert.rejects(
    createSupabaseKPIEvaluationRepositoryAdapter(invalidDatabase).findById(companyId, "id"),
    /KPI_EVALUATION_INVALID_PERSISTED_DATA/
  )
})

function persistedRow(): Readonly<Record<string, unknown>> {
  const dto = toKPIEvaluationDTO(evaluation({ company: companyId }))
  return {
    id: dto.id,
    company_id: dto.context.companyId,
    definition_id: dto.definition.id,
    definition_key: dto.context.definitionKey,
    definition_version: dto.definitionVersion,
    owner_module: dto.context.ownerModule,
    scope_type: dto.context.scopeType,
    scope_id: dto.context.scopeId ?? null,
    period_start: dto.context.periodStart,
    period_end: dto.context.periodEnd,
    evaluated_at: dto.context.evaluatedAt,
    requested_by: dto.context.requestedBy ?? null,
    correlation_id: dto.context.correlationId ?? null,
    metadata: dto.context.metadata,
    result: dto.result,
    created_at: dto.createdAt,
    kpi_evaluation_snapshots: {
      definition_snapshot: {
        ...dto.definition,
        features: { ...dto.definition.features },
        thresholds: dto.definition.thresholds.map((threshold) => ({ ...threshold })),
      },
    },
  }
}

function eqCalls(database: ScriptedKPIDatabase): readonly (readonly unknown[])[] {
  return database.calls.filter((call) => call.operation === "eq").map((call) => call.args)
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected record")
  }
  return value as Record<string, unknown>
}

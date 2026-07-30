import assert from "node:assert/strict"
import test from "node:test"

import {
  createSupabaseKPIDefinitionRepositoryAdapter,
  type KPIDefinitionCalculatorResolver,
} from ".."
import { version } from "./kpi-test-fixtures"
import { ScriptedKPIDatabase } from "./supabase-kpi-test-database"

const companyId = "11111111-1111-4111-8111-111111111111"
const calculator = (input: unknown) => typeof input === "number" ? input : null
const resolver: KPIDefinitionCalculatorResolver = { resolve: () => calculator }

test("Supabase definition repository persiste via RPC com company scope", async () => {
  const database = new ScriptedKPIDatabase()
  database.enqueueRpc()
  const repository = createSupabaseKPIDefinitionRepositoryAdapter(database, companyId, resolver)
  await repository.save(version())

  const call = database.calls.find((item) => item.operation === "rpc")
  assert.equal(call?.args[0], "persist_kpi_definition_version")
  assert.equal((call?.args[1] as Readonly<Record<string, unknown>>).p_company_id, companyId)
})

test("reidrata definição persistida com calculator injetado", async () => {
  const database = new ScriptedKPIDatabase()
  database.enqueueQuery(definitionRow())
  const repository = createSupabaseKPIDefinitionRepositoryAdapter(database, companyId, resolver)
  const restored = await repository.findByKeyAndVersion("test.metric", 1)

  assert.equal(restored?.definition.calculate(7), 7)
  assert.equal(restored?.effectiveFrom.toISOString(), "2026-01-01T00:00:00.000Z")
  assert.deepEqual(filterCalls(database), [
    ["company_id", companyId],
    ["definition_key", "test.metric"],
    ["version", 1],
  ])
})

test("resolve versão ativa com intervalo temporal explícito", async () => {
  const database = new ScriptedKPIDatabase()
  database.enqueueQuery(definitionRow())
  const repository = createSupabaseKPIDefinitionRepositoryAdapter(database, companyId, resolver)
  await repository.findActiveByKey("test.metric", new Date("2026-01-15T00:00:00.000Z"))
  assert.equal(database.calls.some((call) => call.operation === "lte"), true)
  assert.equal(database.calls.some((call) => call.operation === "or"), true)
})

test("lista definições em ordem determinística e por owner module", async () => {
  const database = new ScriptedKPIDatabase()
  database.enqueueQuery([definitionRow()])
  database.enqueueQuery([definitionRow()])
  const repository = createSupabaseKPIDefinitionRepositoryAdapter(database, companyId, resolver)
  assert.equal((await repository.list()).length, 1)
  assert.equal((await repository.listByOwnerModule("test-module")).length, 1)
  assert.equal(filterCalls(database).some(([column]) => column === "owner_module"), true)
})

test("propaga erro Supabase de definição", async () => {
  const database = new ScriptedKPIDatabase()
  database.enqueueQuery(null, { message: "database failure" })
  const repository = createSupabaseKPIDefinitionRepositoryAdapter(database, companyId, resolver)
  await assert.rejects(repository.findByIdAndVersion("definition-1", 1), /database failure/)
})

function definitionRow(): Readonly<Record<string, unknown>> {
  return {
    definition_id: "definition-1",
    definition_key: "test.metric",
    version: 1,
    effective_from: "2026-01-01T00:00:00.000Z",
    effective_until: null,
    active: true,
    name: "Métrica",
    description: "Teste",
    owner_module: "test-module",
    category: "test",
    value_kind: "number",
    unit: null,
    precision: 0,
    favorable_direction: "increase",
    thresholds: [],
    target: null,
    features: { trend: false, benchmark: false, forecast: false, sla: false },
  }
}

function filterCalls(database: ScriptedKPIDatabase): readonly (readonly unknown[])[] {
  return database.calls.filter((call) => call.operation === "eq").map((call) => call.args)
}

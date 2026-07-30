import assert from "node:assert/strict"
import test from "node:test"

import {
  KPIEngine,
  KPIEvaluationError,
  KPIEvaluationService,
  KPIRegistry,
  KPIRegistryError,
  KPICalculatorEngine,
  createKPIEvaluationContext,
  type Clock,
  type IdGenerator,
} from ".."
import { companyId, context, february, january, version } from "./kpi-test-fixtures"

const createdAt = new Date("2026-04-01T12:00:00.000Z")

test("avalia KPI com versão explícita", () => {
  const { service } = setup()
  const evaluation = service.create({
    context: context({ definitionVersion: 1 }),
    source: { value: 42 },
  })
  assert.equal(evaluation.definitionVersion, 1)
  assert.equal(evaluation.result.result.value, 42)
})

test("avalia KPI usando versão ativa em evaluatedAt", () => {
  const registry = new KPIRegistry()
  registry.registerMany([
    version({ effectiveUntil: february }),
    version({ version: 2, effectiveFrom: february }),
  ])
  const { service } = setup(registry)
  const evaluation = service.create({
    context: context({ evaluatedAt: february }),
    source: { value: 20 },
  })
  assert.equal(evaluation.definitionVersion, 2)
})

test("usa evaluatedAt para resolver versão histórica", () => {
  const registry = new KPIRegistry()
  registry.registerMany([
    version({ effectiveUntil: february }),
    version({ version: 2, effectiveFrom: february }),
  ])
  assert.equal(setup(registry).service.create({
    context: context({ evaluatedAt: january }), source: { value: 1 },
  }).definitionVersion, 1)
})

test("usa Clock e IdGenerator injetados", () => {
  const evaluation = setup().service.create({ context: context(), source: { value: 1 } })
  assert.equal(evaluation.id, "fixed-evaluation-id")
  assert.equal(evaluation.createdAt.toISOString(), createdAt.toISOString())
})

test("cria snapshot serializável sem calculator", () => {
  const snapshot = setup().service.create({ context: context(), source: { value: 1 } }).definition
  assert.equal(snapshot.key, "test.metric")
  assert.equal(snapshot.ownerModule, "test-module")
  assert.equal("calculate" in snapshot, false)
  assert.doesNotThrow(() => JSON.stringify(snapshot))
})

test("executa o calculator exatamente uma vez", () => {
  let calls = 0
  const registry = new KPIRegistry()
  registry.register(version({}, { calculate: () => { calls += 1; return 1 } }))
  setup(registry).service.create({ context: context(), source: {} })
  assert.equal(calls, 1)
})

test("preserva company, escopo e metadata", () => {
  const evaluation = setup().service.create({
    context: context({ scopeType: "team", scopeId: "team-1", metadata: { nested: { ok: true } } }),
    source: { value: 1 },
  })
  assert.equal(evaluation.context.companyId, companyId)
  assert.equal(evaluation.context.scopeId, "team-1")
  assert.deepEqual(evaluation.context.metadata, { nested: { ok: true } })
})

const invalidContexts = [
  ["companyId vazio", { companyId: "" }],
  ["definitionKey vazia", { definitionKey: "" }],
  ["ownerModule vazio", { ownerModule: "" }],
  ["período invertido", { periodStart: february, periodEnd: january }],
  ["scopeId ausente", { scopeType: "team" as const, scopeId: undefined }],
] as const

for (const [label, overrides] of invalidContexts) {
  test(`rejeita ${label}`, () => {
    assert.throws(() => createKPIEvaluationContext(context(overrides)),
      (error) => error instanceof KPIEvaluationError && error.code === "INVALID_CONTEXT")
  })
}

test("rejeita ownerModule incompatível", () => {
  assert.throws(() => setup().service.create({
    context: context({ ownerModule: "other-module" }), source: { value: 1 },
  }), (error) => error instanceof KPIEvaluationError && error.code === "OWNER_MODULE_MISMATCH")
})

test("distingue definição inexistente", () => {
  assert.throws(() => setup().service.create({
    context: context({ definitionKey: "missing" }), source: { value: 1 },
  }), (error) => error instanceof KPIRegistryError && error.code === "ACTIVE_DEFINITION_NOT_FOUND")
})

test("propaga erro do calculator com causa e sem avaliação parcial", () => {
  const registry = new KPIRegistry()
  const cause = new Error("calculator failed")
  registry.register(version({}, { calculate: () => { throw cause } }))
  assert.throws(() => setup(registry).service.create({ context: context(), source: {} }),
    (error) => error instanceof KPIEvaluationError &&
      error.code === "CALCULATION_FAILED" && error.cause === cause)
})

test("não muta contexto e copia datas e metadata", () => {
  const periodStart = new Date(january)
  const metadata = { nested: { value: 1 } }
  const input = context({ periodStart, metadata })
  const evaluation = setup().service.create({ context: input, source: { value: 1 } })
  periodStart.setUTCFullYear(2030)
  metadata.nested.value = 2
  assert.equal(evaluation.context.periodStart.toISOString(), january.toISOString())
  assert.deepEqual(evaluation.context.metadata, { nested: { value: 1 } })
  assert.notEqual(evaluation.context.periodStart, input.periodStart)
})

function setup(existingRegistry?: KPIRegistry): Readonly<{ service: KPIEvaluationService }> {
  const registry = existingRegistry ?? new KPIRegistry()
  if (!existingRegistry) registry.register(version())
  const clock: Clock = { now: () => new Date(createdAt) }
  const ids: IdGenerator = { generate: () => "fixed-evaluation-id" }
  return {
    service: new KPIEvaluationService(
      registry,
      new KPIEngine(new KPICalculatorEngine(() => january)),
      clock,
      ids
    ),
  }
}

import assert from "node:assert/strict"
import test from "node:test"

import {
  InMemoryKPIEvaluationRepository,
  KPIEngine,
  KPIEvaluationApplicationError,
  KPIEvaluationApplicationService,
  KPIEvaluationError,
  KPIEvaluationService,
  KPIRegistry,
  KPICalculatorEngine,
  type Clock,
  type IdGenerator,
  type KPIEvaluation,
  type KPIEvaluationRepository,
  type ListKPIEvaluationsByCompanyInput,
  type ListKPIEvaluationsByDefinitionInput,
  type ListKPIEvaluationsByScopeInput,
} from ".."
import { companyId, context, february, january, version } from "./kpi-test-fixtures"

test("evaluate cria, persiste e retorna DTO serializável", async () => {
  const { application, repository } = setup()
  const dto = await application.evaluate({ context: context(), source: { value: 10 } })
  assert.equal(dto.result.result.value, 10)
  assert.equal((await repository.listByCompany({ companyId })).length, 1)
  assert.doesNotThrow(() => JSON.stringify(dto))
})

test("não persiste quando o cálculo falha e não mascara a falha", async () => {
  const { application, repository } = setup({ calculatorFails: true })
  await assert.rejects(
    application.evaluate({ context: context(), source: {} }),
    (error) => error instanceof KPIEvaluationError && error.code === "CALCULATION_FAILED"
  )
  assert.equal((await repository.listByCompany({ companyId })).length, 0)
})

test("busca por ID exige e respeita companyId", async () => {
  const { application } = setup()
  const created = await application.evaluate({ context: context(), source: { value: 10 } })
  assert.equal((await application.getEvaluationById({ companyId, evaluationId: created.id }))?.id, created.id)
  assert.equal(await application.getEvaluationById({ companyId: "other", evaluationId: created.id }), null)
})

test("lista por empresa, definição e escopo", async () => {
  const { application } = setup()
  await application.evaluate({ context: context({ scopeType: "team", scopeId: "team-1" }), source: { value: 1 } })
  assert.equal((await application.listEvaluationsByCompany({ companyId })).length, 1)
  assert.equal((await application.listEvaluationsByDefinition({ companyId, definitionKey: "test.metric" })).length, 1)
  assert.equal((await application.listEvaluationsByScope({ companyId, scopeType: "team", scopeId: "team-1" })).length, 1)
})

test("preserva filtros temporais, limit, offset e ordenação do repository", async () => {
  let counter = 0
  const { application } = setup({ id: () => `id-${++counter}` })
  await application.evaluate({ context: context({ evaluatedAt: january }), source: { value: 1 } })
  await application.evaluate({ context: context({ evaluatedAt: february }), source: { value: 2 } })
  const values = await application.listEvaluationsByDefinition({
    companyId,
    definitionKey: "test.metric",
    periodStart: january,
    periodEnd: february,
    limit: 1,
    offset: 1,
  })
  assert.deepEqual(values.map((item) => item.id), ["id-2"])
})

test("falha de repository é propagada com contexto e causa", async () => {
  const failure = new Error("repository failed")
  const { application } = setup({ repository: new FailingRepository(failure) })
  await assert.rejects(
    application.evaluate({ context: context(), source: { value: 1 } }),
    (error) => error instanceof KPIEvaluationApplicationError && error.cause === failure
  )
})

test("metadata do DTO permanece isolada", async () => {
  const metadata = { nested: { value: 1 } }
  const { application } = setup()
  const dto = await application.evaluate({ context: context({ metadata }), source: { value: 1 } })
  metadata.nested.value = 2
  assert.deepEqual(dto.context.metadata, { nested: { value: 1 } })
  assert.equal(Object.isFrozen(dto.context.metadata), true)
})

function setup(options: Readonly<{
  calculatorFails?: boolean
  id?: () => string
  repository?: KPIEvaluationRepository
}> = {}) {
  const registry = new KPIRegistry()
  registry.register(version({}, options.calculatorFails
    ? { calculate: () => { throw new Error("calculation failed") } }
    : {}))
  const clock: Clock = { now: () => january }
  const ids: IdGenerator = { generate: options.id ?? (() => "evaluation-id") }
  const repository = options.repository ?? new InMemoryKPIEvaluationRepository()
  const evaluationService = new KPIEvaluationService(
    registry,
    new KPIEngine(new KPICalculatorEngine(() => january)),
    clock,
    ids
  )
  return {
    application: new KPIEvaluationApplicationService(evaluationService, repository),
    repository,
  }
}

class FailingRepository implements KPIEvaluationRepository {
  constructor(private readonly failure: Error) {}
  async save(evaluation: KPIEvaluation): Promise<void> {
    void evaluation
    throw this.failure
  }
  async findById(company: string, evaluationId: string): Promise<KPIEvaluation | null> {
    void company
    void evaluationId
    throw this.failure
  }
  async listByCompany(input: ListKPIEvaluationsByCompanyInput): Promise<readonly KPIEvaluation[]> {
    void input
    throw this.failure
  }
  async listByDefinition(input: ListKPIEvaluationsByDefinitionInput): Promise<readonly KPIEvaluation[]> {
    void input
    throw this.failure
  }
  async listByScope(input: ListKPIEvaluationsByScopeInput): Promise<readonly KPIEvaluation[]> {
    void input
    throw this.failure
  }
}

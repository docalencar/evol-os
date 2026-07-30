import assert from "node:assert/strict"
import test from "node:test"

import {
  InMemoryKPIEvaluationRepository, KPIEngine, KPIEvaluationApplicationService,
  KPIEvaluationService, KPICalculatorEngine, KPIRegistry,
} from "../.."
import { context, january, february, version } from "../../tests/kpi-test-fixtures"
import {
  completeKPIExecution, createKPIExecution, createKPIExecutionAttempt,
  createKPIExecutionPlatform, DefaultKPIRetryPolicy, DurableKPIExecutionPolicy,
  ExponentialKPIBackoffStrategy, failKPIExecution,
  InMemoryKPIExecutionAttemptRepository, InMemoryKPIExecutionRepository,
  InMemoryKPIExecutionTelemetry,
  KPIExecutionHistoryQueryService, SingleExecutionExecutor, startKPIExecution,
  SupabaseKPIExecutionRepository, type KPIExecutionDatabase,
  type KPIExecutionDatabaseQuery, type KPIExecutionRequest,
} from ".."

test("entidade valida transições explícitas", () => {
  const pending = execution()
  const running = startKPIExecution(pending, january)
  const succeeded = completeKPIExecution(running, "succeeded", { persisted: 1 }, february)
  assert.equal(running.attemptCount, 1)
  assert.equal(succeeded.status, "succeeded")
  assert.throws(() => startKPIExecution(succeeded, february), /INVALID_TRANSITION/)
})

test("execução registra falha e permite nova tentativa sequencial", () => {
  const failed = failKPIExecution(startKPIExecution(execution(), january), { code: "timeout" }, february)
  const retried = startKPIExecution(failed, february)
  assert.equal(retried.attemptCount, 2)
  assert.equal(retried.status, "running")
})

test("tentativa valida número e transição", () => {
  assert.throws(() => createKPIExecutionAttempt({ id: "a", executionId: "e", attemptNumber: 0, startedAt: january }), /INVALID_NUMBER/)
  assert.equal(createKPIExecutionAttempt({ id: "a", executionId: "e", attemptNumber: 1, startedAt: january }).status, "running")
})

test("repository em memória reserva idempotência e isola empresa/provider", async () => {
  const repository = new InMemoryKPIExecutionRepository()
  assert.equal((await repository.reserve(execution())).reserved, true)
  assert.equal((await repository.reserve({ ...execution(), id: "execution-2" })).reserved, false)
  assert.equal((await repository.reserve({ ...execution(), id: "execution-3", providerKey: "other" })).reserved, true)
  assert.equal(await repository.findById("other-company", "execution-1"), null)
})

test("attempt repository impede número duplicado e pagina", async () => {
  const repository = new InMemoryKPIExecutionAttemptRepository()
  await repository.save(createKPIExecutionAttempt({ id: "a1", executionId: "e", attemptNumber: 1, startedAt: january }))
  await assert.rejects(repository.save(createKPIExecutionAttempt({ id: "a2", executionId: "e", attemptNumber: 1, startedAt: january })), /DUPLICATE/)
  assert.equal((await repository.listByExecution("e", { limit: 1, offset: 0 })).length, 1)
})

test("retry e backoff são determinísticos, limitados e sem timers", () => {
  const backoff = new ExponentialKPIBackoffStrategy(100, 500)
  assert.deepEqual([1, 2, 4].map((attempt) => backoff.durationMs(attempt)), [100, 200, 500])
  const retry = new DefaultKPIRetryPolicy(3, ["timeout"], backoff)
  assert.equal(retry.decide({ attemptCount: 1, errorCode: "timeout", explicit: false }).retry, true)
  assert.equal(retry.decide({ attemptCount: 1, errorCode: "validation", explicit: false }).reason, "non-retryable")
  assert.equal(retry.decide({ attemptCount: 3, errorCode: "timeout", explicit: true }).reason, "max-attempts")
})

test("durable policy persiste execução, tentativa e evita avaliação duplicada", async () => {
  const fixture = platformFixture()
  assert.equal((await fixture.platform.execute(request("durable"))).status, "succeeded")
  assert.equal((await fixture.platform.execute(request("durable"))).status, "duplicate")
  assert.equal((await fixture.evaluations.listByCompany({ companyId: "company-1" })).length, 1)
  const stored = await fixture.executions.findByIdempotencyKey("company-1", "test", "durable")
  assert.equal(stored?.status, "succeeded")
  assert.equal(stored?.attemptCount, 1)
  assert.equal(fixture.telemetry.events().some((event) => event.attemptId !== undefined &&
    event.correlationId === "correlation-1"), true)
})

test("durable policy registra falha seguida de retry explícito", async () => {
  const fixture = platformFixture()
  const invalid = { ...request("retry"), evaluation: { ...request("retry").evaluation,
    context: context({ definitionKey: "missing" }) } }
  assert.equal((await fixture.platform.execute(invalid)).status, "failed")
  assert.equal((await fixture.platform.execute({ ...request("retry"), allowReexecution: true })).status, "succeeded")
  const stored = await fixture.executions.findByIdempotencyKey("company-1", "test", "retry")
  assert.equal(stored?.attemptCount, 2)
})

test("history consulta DTOs, correlationId, status, período e paginação", async () => {
  const executions = new InMemoryKPIExecutionRepository()
  const attempts = new InMemoryKPIExecutionAttemptRepository()
  await executions.reserve(execution())
  const history = new KPIExecutionHistoryQueryService(executions, attempts)
  assert.equal((await history.getById("company-1", "execution-1"))?.createdAt, january.toISOString())
  assert.equal((await history.listByCorrelationId("company-1", "correlation-1", { limit: 10, offset: 0 })).length, 1)
  assert.equal((await history.listByPeriod("company-1", january, february, { limit: 1, offset: 0 })).length, 1)
  assert.equal((await history.listRunning("company-1", { limit: 10, offset: 0 })).length, 0)
})

test("Supabase repository reserva por RPC e consulta com companyId", async () => {
  const database = new ExecutionDatabaseMock()
  const repository = new SupabaseKPIExecutionRepository(database)
  database.rpcData = [{ reserved: true, execution_id: "execution-1" }]
  assert.equal((await repository.reserve(execution())).reserved, true)
  assert.equal(database.calls.some((call) => call[0] === "rpc" && call[1] === "reserve_kpi_execution"), true)
})

function execution() {
  return createKPIExecution({ id: "execution-1", companyId: "company-1", providerKey: "test",
    idempotencyKey: "key-1", correlationId: "correlation-1", executionType: "single",
    requestedAt: january, requestSnapshot: { definitionKey: "test.metric" }, createdAt: january })
}

function request(idempotencyKey: string): KPIExecutionRequest {
  return { providerKey: "test", idempotencyKey, correlationId: "correlation-1",
    evaluation: { context: context({ definitionVersion: 1 }), source: { value: 10 } } }
}

function platformFixture() {
  const registry = new KPIRegistry(); registry.register(version())
  const evaluations = new InMemoryKPIEvaluationRepository()
  let sequence = 0
  const application = new KPIEvaluationApplicationService(new KPIEvaluationService(registry,
    new KPIEngine(new KPICalculatorEngine(() => january)), { now: () => january },
    { generate: () => `evaluation-${++sequence}` }), evaluations)
  const executions = new InMemoryKPIExecutionRepository()
  const attempts = new InMemoryKPIExecutionAttemptRepository()
  const ids = { generate: () => `durable-${++sequence}` }
  const policy = new DurableKPIExecutionPolicy(executions, attempts, { now: () => january }, ids)
  const telemetry = new InMemoryKPIExecutionTelemetry()
  const platform = createKPIExecutionPlatform({ executors: [new SingleExecutionExecutor("test", application)],
    clock: { now: () => january }, idGenerator: ids, policy, telemetry })
  return { platform, evaluations, executions, attempts, telemetry }
}

class ExecutionDatabaseMock implements KPIExecutionDatabase, KPIExecutionDatabaseQuery {
  calls: Array<readonly unknown[]> = []
  rpcData: unknown = null
  rpc(name: string, parameters: Readonly<Record<string, unknown>>) {
    this.calls.push(["rpc", name, parameters]); return Promise.resolve({ data: this.rpcData, error: null })
  }
  from(table: string) { this.calls.push(["from", table]); return this }
  select(columns: string) { this.calls.push(["select", columns]); return this }
  upsert(value: Readonly<Record<string, unknown>>) { this.calls.push(["upsert", value]); return Promise.resolve({ data: null, error: null }) }
  eq(column: string, value: string | number) { this.calls.push(["eq", column, value]); return this }
  gte(column: string, value: string) { this.calls.push(["gte", column, value]); return this }
  lte(column: string, value: string) { this.calls.push(["lte", column, value]); return this }
  order(column: string, options: Readonly<{ ascending: boolean }>) { this.calls.push(["order", column, options]); return this }
  range(from: number, to: number) { this.calls.push(["range", from, to]); return this }
  maybeSingle() { return Promise.resolve({ data: null, error: null }) }
  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected)
  }
}

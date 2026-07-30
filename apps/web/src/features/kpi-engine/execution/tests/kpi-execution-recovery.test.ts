import assert from "node:assert/strict"
import test from "node:test"

import {
  InMemoryKPIEvaluationRepository, KPIEngine, KPIEvaluationApplicationService,
  KPIEvaluationService, KPICalculatorEngine, KPIRegistry,
} from "../.."
import { context, february, january, version } from "../../tests/kpi-test-fixtures"
import {
  acquireExecutionLease, createKPIExecution, createKPIExecutionAttempt,
  createKPIExecutionPlatform, createKPIRecoveryOrchestration,
  DefaultKPIRetryPolicy, DurableKPIExecutionPolicy, ExecutionCoordinator, ExecutionDispatcher,
  ExponentialKPIBackoffStrategy, InMemoryExecutionLeaseRepository,
  InMemoryKPIExecutionAttemptRepository, InMemoryKPIExecutionRepository,
  InMemoryKPIExecutionTelemetry, isExecutionLeaseExpired,
  KPIExecutionOperationalHistoryService, renewExecutionLease,
  SingleExecutionExecutor, startKPIExecution, stealExpiredExecutionLease,
  SupabaseExecutionLeaseRepository, type KPIExecutionDatabase,
  type KPIExecutionRequest,
} from ".."

test("lease lifecycle adquire, renova, expira e valida owner", () => {
  const lease = acquireExecutionLease({ executionId: "e1", ownerId: "worker-1",
    leaseId: "lease-1", acquiredAt: january, durationMs: 100 })
  const renewed = renewExecutionLease(lease, "worker-1", january, 200)
  assert.equal(renewed.renewedAt, january)
  assert.equal(isExecutionLeaseExpired(renewed, february), true)
  assert.throws(() => renewExecutionLease(lease, "other", january, 100), /OWNER_MISMATCH/)
})

test("lease expirada pode ser roubada deterministicamente", () => {
  const lease = acquireExecutionLease({ executionId: "e1", ownerId: "old",
    leaseId: "old-lease", acquiredAt: january, durationMs: 100 })
  const stolen = stealExpiredExecutionLease(lease, { ownerId: "new", leaseId: "new-lease",
    acquiredAt: february, durationMs: 100 })
  assert.equal(stolen.ownerId, "new")
  assert.equal(stolen.leaseId, "new-lease")
})

test("coordination garante aquisição exclusiva, renovação e liberação", async () => {
  const executions = new InMemoryKPIExecutionRepository()
  const leases = new InMemoryExecutionLeaseRepository(executions)
  const telemetry = new InMemoryKPIExecutionTelemetry()
  const coordinator = new ExecutionCoordinator(leases, telemetry, { now: () => january },
    { generate: () => "lease-1" }, "worker-1", 100)
  const first = await coordinator.acquire("company-1", "e1")
  assert.ok(first)
  assert.equal(await coordinator.acquire("company-1", "e1"), null)
  assert.ok(await coordinator.renew("company-1", first))
  assert.equal(await coordinator.release("company-1", first), true)
  assert.deepEqual(new KPIExecutionOperationalHistoryService(telemetry).listLeases()
    .map((event) => event.kind), ["lease_acquired", "lease_renewed", "lease_released"])
})

test("dispatcher preserva pipeline, executor e telemetria", async () => {
  const fixture = evaluationPlatform()
  const telemetry = new InMemoryKPIExecutionTelemetry()
  const dispatcher = new ExecutionDispatcher(fixture.platform, telemetry, { now: () => january })
  const result = await dispatcher.dispatch(request("dispatch"))
  assert.equal(result.status, "succeeded")
  assert.deepEqual(new KPIExecutionOperationalHistoryService(telemetry)
    .listDispatcherExecutions().map((event) => event.kind), ["dispatcher_started", "dispatcher_completed"])
})

test("recovery encontra execução abandonada, rouba lease e reinicia tentativa", async () => {
  const fixture = await recoveryFixture(3)
  const results = await fixture.recovery.recover("company-1", { limit: 10, offset: 0 })
  assert.equal(results[0]?.status, "recovered")
  assert.equal((await fixture.executions.findById("company-1", "execution-1"))?.status, "succeeded")
  assert.equal((await fixture.attempts.listByExecution("execution-1", { limit: 10, offset: 0 })).length, 2)
  assert.equal(new KPIExecutionOperationalHistoryService(fixture.telemetry)
    .listRecoveries().some((event) => event.kind === "recovery_completed"), true)
})

test("recovery interrompe após limite de tentativas", async () => {
  const fixture = await recoveryFixture(1)
  const results = await fixture.recovery.recover("company-1", { limit: 10, offset: 0 })
  assert.equal(results[0]?.status, "interrupted")
  assert.equal((await fixture.executions.findById("company-1", "execution-1"))?.status, "interrupted")
})

test("recovery sem resolver request interrompe sem processamento duplicado", async () => {
  const fixture = await recoveryFixture(3, false)
  const results = await fixture.recovery.recover("company-1", { limit: 10, offset: 0 })
  assert.equal(results[0]?.status, "interrupted")
  assert.equal((await fixture.executions.findById("company-1", "execution-1"))?.status, "interrupted")
  assert.equal((await fixture.evaluations.listByCompany({ companyId: "company-1" })).length, 0)
})

test("Supabase lease repository usa RPC transacional", async () => {
  const calls: string[] = []
  const database: KPIExecutionDatabase = {
    rpc(name) { calls.push(name); return Promise.resolve({ data: true, error: null }) },
    from() { throw new Error("not used") },
  }
  const repository = new SupabaseExecutionLeaseRepository(database, { now: () => january })
  const lease = acquireExecutionLease({ executionId: "e1", ownerId: "worker",
    leaseId: "lease", acquiredAt: january, durationMs: 100 })
  assert.equal(await repository.acquire("company-1", lease), true)
  assert.deepEqual(calls, ["acquire_execution_lease"])
})

async function recoveryFixture(maxAttempts: number, resolves = true) {
  const evaluationsFixture = evaluationPlatform()
  const executions = new InMemoryKPIExecutionRepository()
  const attempts = new InMemoryKPIExecutionAttemptRepository()
  const running = startKPIExecution(createKPIExecution({ id: "execution-1", companyId: "company-1",
    providerKey: "test", idempotencyKey: "recover", correlationId: "correlation-1",
    executionType: "single", requestedAt: january, requestSnapshot: { definitionKey: "test.metric" },
    createdAt: january }), january)
  await executions.reserve(running)
  await executions.save(running)
  await attempts.save(createKPIExecutionAttempt({ id: "attempt-1", executionId: running.id,
    attemptNumber: 1, startedAt: january }))
  const leases = new InMemoryExecutionLeaseRepository(executions, attempts)
  await leases.acquire("company-1", acquireExecutionLease({ executionId: running.id,
    ownerId: "old-worker", leaseId: "old-lease", acquiredAt: january, durationMs: 100 }))
  const telemetry = new InMemoryKPIExecutionTelemetry()
  let sequence = 0
  const durable = new DurableKPIExecutionPolicy(
    executions, attempts, { now: () => february }, { generate: () => `id-${++sequence}` })
  const platform = createKPIExecutionPlatform({
    executors: evaluationsFixture.executors, clock: { now: () => february },
    idGenerator: { generate: () => `execution-id-${++sequence}` }, policy: durable, telemetry,
  })
  const retry = new DefaultKPIRetryPolicy(maxAttempts, ["lease_expired"],
    new ExponentialKPIBackoffStrategy(100, 1000))
  const orchestration = createKPIRecoveryOrchestration({ leases, platform, retryPolicy: retry,
    requestResolver: { resolve: async () => resolves ? request("recover") : null }, telemetry,
    clock: { now: () => february }, idGenerator: { generate: () => `lease-${++sequence}` },
    ownerId: "recovery-worker", leaseDurationMs: 100 })
  return { ...orchestration, executions, attempts, evaluations: evaluationsFixture.evaluations, telemetry }
}

function evaluationPlatform() {
  const registry = new KPIRegistry(); registry.register(version())
  const evaluations = new InMemoryKPIEvaluationRepository()
  let sequence = 0
  const application = new KPIEvaluationApplicationService(new KPIEvaluationService(registry,
    new KPIEngine(new KPICalculatorEngine(() => january)), { now: () => january },
    { generate: () => `evaluation-${++sequence}` }), evaluations)
  const executors = [new SingleExecutionExecutor("test", application)]
  const platform = createKPIExecutionPlatform({ executors, clock: { now: () => january },
    idGenerator: { generate: () => `execution-${++sequence}` } })
  return { platform, executors, evaluations }
}

function request(idempotencyKey: string): KPIExecutionRequest {
  return { providerKey: "test", idempotencyKey, correlationId: "correlation-1",
    evaluation: { context: context({ definitionVersion: 1 }), source: { value: 10 } } }
}

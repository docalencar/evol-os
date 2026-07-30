import assert from "node:assert/strict"
import test from "node:test"

import {
  InMemoryKPIEvaluationRepository, KPIEngine, KPIEvaluationApplicationService,
  KPIEvaluationService, KPICalculatorEngine, KPIRegistry,
} from "../../.."
import { context, january, version } from "../../../tests/kpi-test-fixtures"
import {
  acquireExecutionLease, createKPIExecution, createKPIExecutionPlatform, createKPIRecoveryOrchestration,
  DefaultKPIRetryPolicy, DurableKPIExecutionPolicy, ExponentialKPIBackoffStrategy,
  InMemoryExecutionLeaseRepository, InMemoryKPIExecutionAttemptRepository,
  InMemoryKPIExecutionRepository, InMemoryKPIExecutionTelemetry,
  SingleExecutionExecutor, type KPIExecution, type KPIExecutionRequest,
} from "../.."
import {
  AdaptiveKPIWorkerPollingStrategy, CooperativeKPIWorkerCancellationSource,
  CoordinatedKPIWorkerHeartbeat, createDefaultKPIWorkerRuntimeConfig,
  createKPIWorkerRuntime, DefaultKPIWorkerHealthService,
  DefaultKPIWorkerWorkPriority, InMemoryKPIWorkerMetrics,
  InMemoryKPIWorkerTelemetry, KPIWorkerError, RepositoryKPIWorkerWorkDiscovery,
  transitionKPIWorkerState, createKPIWorkerRuntimeState,
  validateKPIWorkerRuntimeConfig, type KPIWorkerWorkDiscovery,
} from ".."

test("estado aceita lifecycle oficial e rejeita transição inválida", () => {
  const idle = createKPIWorkerRuntimeState()
  const starting = transitionKPIWorkerState(idle, "starting", january)
  assert.equal(transitionKPIWorkerState(starting, "running", january).status, "running")
  assert.throws(() => transitionKPIWorkerState(idle, "running", january), /Transição inválida/)
})

test("config default é válida e rejeita limites incoerentes", () => {
  const config = createDefaultKPIWorkerRuntimeConfig()
  assert.doesNotThrow(() => validateKPIWorkerRuntimeConfig(config))
  assert.throws(() => validateKPIWorkerRuntimeConfig({ ...config,
    leaseRenewalThresholdMs: config.leaseDurationMs }), /incoerentes/)
})

test("polling executa imediatamente, espera, aplica backoff e para", () => {
  const strategy = new AdaptiveKPIWorkerPollingStrategy(createDefaultKPIWorkerRuntimeConfig())
  const base = { hadWork: false, hadError: false, hadRecovery: false, leaseContention: false,
    consecutiveEmptyCycles: 1, consecutiveFailures: 0, cancelled: false,
    runtimeStatus: "running" as const }
  assert.equal(strategy.decide({ ...base, hadWork: true }).decision, "run_immediately")
  assert.equal(strategy.decide(base).decision, "wait")
  assert.equal(strategy.decide({ ...base, hadError: true, consecutiveFailures: 3 }).decision, "backoff")
  assert.equal(strategy.decide({ ...base, cancelled: true }).decision, "stop")
})

test("cancelamento cooperativo preserva motivo tipado", () => {
  const source = new CooperativeKPIWorkerCancellationSource(); source.cancel("shutdown")
  assert.equal(source.token.isCancellationRequested(), true)
  assert.equal(source.token.getReason(), "shutdown")
  assert.throws(() => source.token.throwIfCancellationRequested(), (error) =>
    error instanceof KPIWorkerError && error.code === "WORKER_CANCELLED")
})

test("runtime inicia, executa ciclo vazio e encerra graciosamente", async () => {
  const fixture = runtimeFixture()
  await fixture.runtime.start()
  const cycle = await fixture.runtime.runCycle()
  assert.equal(cycle.status, "empty")
  assert.equal(cycle.polling.decision, "wait")
  assert.equal((await fixture.runtime.stop()).state.status, "stopped")
  assert.equal(fixture.metrics.snapshot().emptyCycles, 1)
})

test("runtime pode reiniciar após failed", async () => {
  const fixture = runtimeFixture(); await fixture.runtime.start(); await fixture.runtime.fail("boom")
  assert.equal((await fixture.runtime.start()).state.status, "running")
})

test("ciclo processa execução pending por lease, dispatcher e durable policy", async () => {
  const fixture = runtimeFixture()
  await fixture.executions.reserve(pendingExecution("pending-1"))
  await fixture.runtime.start()
  const cycle = await fixture.runtime.runCycle()
  assert.equal(cycle.pendingProcessed, 1)
  assert.equal(cycle.succeeded, 1)
  assert.equal((await fixture.executions.findById("company-1", "pending-1"))?.status, "succeeded")
  assert.equal(fixture.metrics.snapshot().executionsSucceeded, 1)
})

test("ciclo processa retry failed sem criar avaliação duplicada", async () => {
  const fixture = runtimeFixture()
  const failed = { ...pendingExecution("retry-1"), status: "failed" as const, failedAt: january }
  await fixture.executions.reserve(failed)
  await fixture.runtime.start()
  const cycle = await fixture.runtime.runCycle()
  assert.equal(cycle.retriesProcessed, 1)
  assert.equal(cycle.succeeded, 1)
  assert.equal((await fixture.executions.findById("company-1", "retry-1"))?.status, "succeeded")
})

test("discovery prioriza recovery, retry e pending e respeita limites", async () => {
  const fixture = runtimeFixture()
  await fixture.executions.reserve(pendingExecution("p"))
  const failed = { ...pendingExecution("f"), status: "failed" as const, failedAt: january }
  await fixture.executions.reserve(failed)
  const items = await fixture.discovery.discover({ companyId: "company-1", page: { limit: 2, offset: 0 },
    maxPending: 1, maxRetries: 1, maxRecoveries: 1, at: january })
  assert.deepEqual(items.map((item) => item.type), ["retry_execution", "pending_execution"])
})

test("cancelamento antes do ciclo não inicia trabalho", async () => {
  const fixture = runtimeFixture(); await fixture.runtime.start()
  const cancellation = new CooperativeKPIWorkerCancellationSource(); cancellation.cancel("requested")
  const result = await fixture.runtime.runCycle(cancellation.token)
  assert.equal(result.status, "cancelled")
  assert.equal(fixture.metrics.snapshot().cyclesCancelled, 1)
})

test("health reflete healthy, degraded, unhealthy e stopped", async () => {
  const fixture = runtimeFixture()
  assert.equal(fixture.runtime.getHealth().status, "stopped")
  await fixture.runtime.start(); assert.equal(fixture.runtime.getHealth().status, "healthy")
  await fixture.runtime.fail("boom"); assert.equal(fixture.runtime.getHealth().status, "unhealthy")
})

test("heartbeat ignora lease distante e renova dentro do threshold", async () => {
  const fixture = runtimeFixture(); await fixture.runtime.start()
  const lease = await fixture.orchestration.coordinator.acquire("company-1", "execution-heartbeat")
  assert.ok(lease)
  const result = await fixture.heartbeat.runHeartbeat("company-1", [lease],
    new CooperativeKPIWorkerCancellationSource().token)
  assert.equal(result.renewed, 0)
  const near = acquireExecutionLease({ executionId: "near", ownerId: "worker-1",
    leaseId: "near-lease", acquiredAt: january, durationMs: 10_000 })
  await fixture.leases.acquire("company-1", near)
  const renewed = await fixture.heartbeat.runHeartbeat("company-1", [near],
    new CooperativeKPIWorkerCancellationSource().token)
  assert.equal(renewed.renewed, 1)
})

test("telemetria propaga workerId e runtimeId", async () => {
  const fixture = runtimeFixture(); await fixture.runtime.start(); await fixture.runtime.runCycle()
  assert.equal(fixture.telemetry.events().every((event) =>
    event.workerId === "worker-1" && event.runtimeId === "runtime-1"), true)
})

test("controller impede dois ciclos concorrentes no mesmo runtime", async () => {
  let finishDiscovery: ((items: readonly []) => void) | undefined
  let signalDiscoveryStarted: (() => void) | undefined
  const discoveryStarted = new Promise<void>((resolve) => { signalDiscoveryStarted = resolve })
  const discovery: KPIWorkerWorkDiscovery = {
    discover: () => {
      signalDiscoveryStarted?.()
      return new Promise((resolve) => { finishDiscovery = resolve })
    },
  }
  const fixture = runtimeFixture(discovery); await fixture.runtime.start()
  const first = fixture.runtime.runCycle()
  await discoveryStarted
  await assert.rejects(fixture.runtime.runCycle(), (error) =>
    error instanceof KPIWorkerError && error.code === "CYCLE_ALREADY_RUNNING")
  finishDiscovery?.([])
  assert.equal((await first).status, "empty")
})

function runtimeFixture(discoveryOverride?: KPIWorkerWorkDiscovery) {
  const registry = new KPIRegistry(); registry.register(version())
  const evaluationRepository = new InMemoryKPIEvaluationRepository(); let sequence = 0
  const application = new KPIEvaluationApplicationService(new KPIEvaluationService(registry,
    new KPIEngine(new KPICalculatorEngine(() => january)), { now: () => january },
    { generate: () => `evaluation-${++sequence}` }), evaluationRepository)
  const executions = new InMemoryKPIExecutionRepository()
  const attempts = new InMemoryKPIExecutionAttemptRepository()
  const leases = new InMemoryExecutionLeaseRepository(executions, attempts)
  const executionTelemetry = new InMemoryKPIExecutionTelemetry()
  const policy = new DurableKPIExecutionPolicy(executions, attempts, { now: () => january },
    { generate: () => `durable-${++sequence}` })
  const platform = createKPIExecutionPlatform({ executors: [new SingleExecutionExecutor("test", application)],
    policy, clock: { now: () => january }, idGenerator: { generate: () => `platform-${++sequence}` } })
  const retry = new DefaultKPIRetryPolicy(3, ["lease_expired"], new ExponentialKPIBackoffStrategy(10, 100))
  const resolver = { resolve: async (execution: KPIExecution) =>
    request(execution.id === "pending-1" ? "pending" : execution.id) }
  const orchestration = createKPIRecoveryOrchestration({ leases, platform, retryPolicy: retry,
    requestResolver: resolver, telemetry: executionTelemetry, clock: { now: () => january },
    idGenerator: { generate: () => `lease-${++sequence}` }, ownerId: "worker-1", leaseDurationMs: 60_000 })
  const config = createDefaultKPIWorkerRuntimeConfig()
  const metrics = new InMemoryKPIWorkerMetrics(); const telemetry = new InMemoryKPIWorkerTelemetry()
  const discovery = discoveryOverride ?? new RepositoryKPIWorkerWorkDiscovery(executions, leases,
    new DefaultKPIWorkerWorkPriority())
  const contextValue = { workerId: "worker-1", runtimeId: "runtime-1", companyId: "company-1" }
  const heartbeat = new CoordinatedKPIWorkerHeartbeat(orchestration.coordinator, { now: () => january },
    config.leaseRenewalThresholdMs, contextValue, metrics, telemetry)
  const runtime = createKPIWorkerRuntime({ ...contextValue, config, discovery,
    recovery: orchestration.recovery, resolver, dispatcher: orchestration.dispatcher,
    coordinator: orchestration.coordinator, heartbeat,
    polling: new AdaptiveKPIWorkerPollingStrategy(config),
    health: new DefaultKPIWorkerHealthService({ now: () => january }, config), metrics, telemetry,
    clock: { now: () => january }, idGenerator: { generate: () => `runtime-id-${++sequence}` } })
  return { runtime, metrics, telemetry, executions, discovery, heartbeat, orchestration, leases }
}

function pendingExecution(id: string) {
  return createKPIExecution({ id, companyId: "company-1", providerKey: "test",
    idempotencyKey: id === "pending-1" ? "pending" : id, correlationId: `correlation-${id}`,
    executionType: "single", requestedAt: january, requestSnapshot: { definitionKey: "test.metric" },
    createdAt: january })
}
function request(idempotencyKey: string): KPIExecutionRequest {
  return { providerKey: "test", idempotencyKey, correlationId: "correlation",
    evaluation: { context: context({ definitionVersion: 1 }), source: { value: 10 } } }
}

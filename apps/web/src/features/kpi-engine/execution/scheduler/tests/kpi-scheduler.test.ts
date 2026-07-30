import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import type { Clock, IdGenerator } from "../../.."
import type { KPIWorkerRuntime, KPIWorkerRuntimeState } from "../../runtime"
import { createKPIScheduler } from "../factories"
import { createDefaultKPISchedulerConfig, KPISchedulerError } from "../domain"
import { InMemoryKPISchedulerMetrics, InMemoryKPISchedulerTelemetry } from "../metrics"
import { ClockBasedKPIRateLimiter, DefaultSchedulePolicy, DeterministicKPIBackpressurePolicy,
  WindowedKPITriggerDeduplicator } from "../policies"
import { InMemoryKPITriggerRegistry } from "../registry"
import { WorkerKPIRuntimeInvoker } from "../runtime"
import { CompanyKPITrigger, FutureEventKPITrigger, ManualKPITrigger, ProviderKPITrigger,
  RecoveryKPITrigger, RetryKPITrigger, ScenarioKPITrigger, ScheduledKPITrigger } from "../triggers"
import type { KPIRuntimeInvoker, KPIScheduleContext, KPITriggerRequest } from "../contracts"

const instant = new Date("2026-07-30T12:00:00.000Z")
const clock: Clock = { now: () => instant }
const ids: IdGenerator = { generate: () => "schedule-1" }
const config = createDefaultKPISchedulerConfig()
const context = (overrides: Partial<KPIScheduleContext> = {}): KPIScheduleContext => Object.freeze({
  companyId: "company-1", providerKey: "planning", runtimeStatus: "running", queueSize: 0,
  activeLeases: 0, recentFailures: 0, activeExecutions: 0, lastCycleAt: null, now: instant, ...overrides,
})
const request = (overrides: Partial<KPITriggerRequest> = {}): KPITriggerRequest => Object.freeze({
  triggerId: "trigger-1", type: "manual", reason: "manual", companyId: "company-1",
  providerKey: "planning", requestedAt: instant, ...overrides,
})

test("fontes produzem requests tipados sem executar runtime", () => {
  const sources = [new ManualKPITrigger(), new ScheduledKPITrigger(), new RetryKPITrigger(),
    new RecoveryKPITrigger(), new ProviderKPITrigger(), new CompanyKPITrigger(),
    new ScenarioKPITrigger(), new FutureEventKPITrigger()]
  assert.deepEqual(sources.map((source) => source.create({ triggerId: "id", companyId: "c",
    requestedAt: instant }).type), ["manual", "scheduled", "retry", "recovery", "provider",
    "company", "scenario", "future_event"])
})

test("registry registra, habilita, resolve, lista por prioridade e rejeita duplicidade", () => {
  const registry = new InMemoryKPITriggerRegistry()
  registry.register({ id: "manual", type: "manual", enabled: true, companyId: "c" })
  registry.register({ id: "recovery", type: "recovery", enabled: false, providerKey: "p" })
  assert.deepEqual(registry.list().map((item) => item.id), ["recovery", "manual"])
  assert.equal(registry.resolveByCompany("c").length, 1); assert.equal(registry.resolveByProvider("p").length, 1)
  registry.enable("recovery"); assert.equal(registry.resolveById("recovery")?.enabled, true)
  assert.throws(() => registry.register({ id: "manual", type: "manual", enabled: true }),
    (error) => error instanceof KPISchedulerError && error.code === "DUPLICATE_TRIGGER")
})

test("backpressure retorna continue, delay e reject deterministicamente", () => {
  const policy = new DeterministicKPIBackpressurePolicy(config)
  assert.equal(policy.evaluate(context()).decision, "continue")
  assert.equal(policy.evaluate(context({ queueSize: 100 })).decision, "delay")
  assert.equal(policy.evaluate(context({ queueSize: 200 })).decision, "reject")
})

test("rate limit usa Clock, empresa e provider sem timer ou cache global", () => {
  const limiter = new ClockBasedKPIRateLimiter(clock, { ...config, maxRequestsPerWindow: 1 })
  assert.equal(limiter.consume(request()), true); assert.equal(limiter.consume(request()), false)
  assert.equal(limiter.consume(request({ providerKey: "other" })), true)
})

test("deduplicação considera trigger, empresa, provider e motivo na janela", () => {
  const dedupe = new WindowedKPITriggerDeduplicator(clock, config)
  assert.equal(dedupe.isDuplicate(request()), false); assert.equal(dedupe.isDuplicate(request()), true)
  assert.equal(dedupe.isDuplicate(request({ companyId: "company-2" })), false)
})

test("policy aplica isolamento, concorrência, janela, retry suppression e recovery precedence", () => {
  const policy = new DefaultSchedulePolicy(config, new DeterministicKPIBackpressurePolicy(config),
    new ClockBasedKPIRateLimiter(clock, config), new WindowedKPITriggerDeduplicator(clock, config))
  assert.equal(policy.evaluate(request({ companyId: "other" }), context()).decision, "cancel")
  assert.equal(policy.evaluate(request(), context({ activeExecutions: 1 })).decision, "retry_later")
  assert.equal(policy.evaluate(request({ type: "retry", reason: "retry" }),
    context({ runtimeStatus: "failed" })).decision, "ignore")
  assert.equal(policy.evaluate(request({ type: "recovery", reason: "recovery" }),
    context({ recentFailures: 3 })).decision, "execute")
})

test("scheduler aceita trigger, delega somente ao invoker e registra métricas/telemetria", async () => {
  let invocations = 0
  const invoker: KPIRuntimeInvoker = { invoke: async (decision) => {
    invocations += decision.decision === "execute" ? 1 : 0; return Object.freeze({ invoked: decision.decision === "execute" })
  } }
  const metrics = new InMemoryKPISchedulerMetrics(); const telemetry = new InMemoryKPISchedulerTelemetry()
  const platform = createKPIScheduler({ clock, idGenerator: ids, invoker, metrics, telemetry })
  platform.registry.register({ id: "trigger-1", type: "manual", enabled: true,
    companyId: "company-1", providerKey: "planning" })
  const result = await platform.scheduler.schedule(request(), context())
  assert.equal(result.schedule.decision, "execute"); assert.equal(invocations, 1)
  assert.equal(metrics.snapshot().runtimeInvocations, 1)
  assert.equal(telemetry.list().some((event) => event.kind === "runtime_invoked"), true)
})

test("scheduler ignora trigger desabilitado e deduplica repetição", async () => {
  const invoker: KPIRuntimeInvoker = { invoke: async () => Object.freeze({ invoked: false }) }
  const platform = createKPIScheduler({ clock, idGenerator: ids, invoker })
  platform.registry.register({ id: "trigger-1", type: "manual", enabled: false })
  assert.equal((await platform.scheduler.schedule(request(), context())).schedule.reason, "disabled")
  platform.registry.enable("trigger-1")
  assert.equal((await platform.scheduler.schedule(request(), context())).schedule.decision, "execute")
  assert.equal((await platform.scheduler.schedule(request(), context())).schedule.reason, "duplicate")
})

test("runtime invoker inicia runtime, executa ciclo e respeita decisões sem execução", async () => {
  let starts = 0; let cycles = 0; let status: KPIWorkerRuntimeState["status"] = "idle"
  const state = (): KPIWorkerRuntimeState => Object.freeze({ status, startedAt: null, stoppedAt: null,
    failedAt: null, lastCycleAt: null, lastSuccessfulCycleAt: null, consecutiveFailures: 0,
    consecutiveEmptyCycles: 0, cycleRunning: false })
  const runtime = { getState: state, getHealth: () => Object.freeze({ status: "healthy" as const,
    checkedAt: instant, lastCycleAt: null, lastSuccessfulCycleAt: null, consecutiveFailures: 0,
    activeLeaseCount: 0, reasonCodes: [] }), start: async () => { starts += 1; status = "running";
      return Object.freeze({ state: state() }) }, stop: async () => { status = "stopped";
      return Object.freeze({ state: state() }) }, fail: async () => Object.freeze({ state: state() }),
    runCycle: async () => { cycles += 1; return Object.freeze({ cycleId: "cycle", status: "empty" as const,
      discovered: 0, pendingProcessed: 0, retriesProcessed: 0, recoveriesProcessed: 0, succeeded: 0,
      partiallySucceeded: 0, failed: 0, startedAt: instant, finishedAt: instant,
      polling: { decision: "wait" as const, delayMs: 1, reason: "empty" } }) } } satisfies KPIWorkerRuntime
  const invoker = new WorkerKPIRuntimeInvoker(runtime)
  assert.equal((await invoker.invoke({ decision: "ignore", reason: "disabled", delayMs: 0 })).invoked, false)
  assert.equal((await invoker.invoke({ decision: "execute", reason: "manual", delayMs: 0 })).invoked, true)
  assert.equal(starts, 1); assert.equal(cycles, 1)
})

test("composição server-only conecta scheduler, invoker e worker runtime", async () => {
  const source = await readFile(new URL("../server/create-server-kpi-scheduler.ts", import.meta.url), "utf8")
  assert.match(source, /import "server-only"/)
  assert.match(source, /createServerKPIWorkerRuntime/)
  assert.match(source, /WorkerKPIRuntimeInvoker/)
  assert.match(source, /createKPIScheduler/)
})

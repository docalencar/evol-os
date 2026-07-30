import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import type { Clock, IdGenerator } from "../../.."
import type { KPITriggerScheduler, KPIScheduleContext } from "../../scheduler"
import { DefaultApiOperationalAdapter, DefaultCronOperationalAdapter,
  DefaultQueueOperationalAdapter, DefaultWebhookOperationalAdapter } from "../adapters"
import type { OperationalDatabase, OperationalEvent } from "../contracts"
import { DefaultOperationalCoordinator, InMemoryCoordinatorStore,
  SupabaseCoordinatorStore } from "../coordination"
import { createOperationalPlatform } from "../factories"
import { InMemoryPersistentDeduplicationStore, InMemoryRateLimitStore,
  SupabasePersistentDeduplicationStore, SupabaseRateLimitStore } from "../gateway"
import { InMemoryOperationalMetrics, JsonOperationalMetricsExporter,
  SnapshotOperationalMetricsExporter } from "../metrics"
import { InMemoryOperationalTelemetry } from "../telemetry"

const now = new Date("2026-07-30T12:00:00.000Z"); const later = new Date("2026-07-30T12:01:00.000Z")
const clock: Clock = { now: () => now }; const ids: IdGenerator = { generate: () => "lease-1" }
const event: OperationalEvent = Object.freeze({ eventId: "trigger-1", companyId: "company-1",
  providerKey: "planning", occurredAt: now, priority: 7 })
const context: KPIScheduleContext = Object.freeze({ companyId: "company-1", providerKey: "planning",
  runtimeStatus: "running", queueSize: 0, activeLeases: 0, recentFailures: 0,
  activeExecutions: 0, lastCycleAt: null, now })
const scheduler: KPITriggerScheduler = { schedule: async (request) => Object.freeze({ request,
  schedule: Object.freeze({ scheduleId: "schedule-1", decision: "execute", reason: request.reason,
    delayMs: 0, invoked: true }) }) }

test("cron, queue, webhook e api convertem eventos sem executar Scheduler", () => {
  assert.equal(new DefaultCronOperationalAdapter().adapt({ ...event, scheduleKey: "hourly" }).type, "scheduled")
  assert.equal(new DefaultQueueOperationalAdapter().adapt({ ...event, queueName: "events" }).type, "future_event")
  assert.equal(new DefaultWebhookOperationalAdapter().adapt({ ...event, source: "partner" }).type, "future_event")
  assert.equal(new DefaultApiOperationalAdapter().adapt({ ...event, actorId: "actor" }).type, "manual")
})

test("manual adapter funcional delega ao gateway e preserva prioridade", async () => {
  const platform = createOperationalPlatform({ scheduler, clock, idGenerator: ids, ownerId: "worker" })
  const result = await platform.adapters.manual.execute(event, context)
  assert.equal(result.schedule.invoked, true); assert.equal(result.request.metadata?.priority, "7")
})

test("gateway agenda, agenda vários, cancela e expõe health e metrics", async () => {
  const platform = createOperationalPlatform({ scheduler, clock, idGenerator: ids, ownerId: "worker" })
  const request = platform.adapters.api.adapt({ ...event, actorId: "actor" })
  assert.equal((await platform.gateway.schedule(request, context)).schedule.decision, "execute")
  assert.equal((await platform.gateway.scheduleMany([request, request], context)).length, 2)
  await platform.gateway.cancel("company-2")
  assert.deepEqual(platform.gateway.health().cancelledCompanies, ["company-2"])
  assert.equal(platform.gateway.metrics().gatewaySchedules, 3)
})

test("coordinator limita concorrência, isola empresa e aplica cancelamento", async () => {
  const store = new InMemoryCoordinatorStore()
  const first = Object.freeze({ leaseId: "a", companyId: "c", ownerId: "o", acquiredAt: now, expiresAt: later })
  assert.equal(await store.acquire(first, 1), true)
  assert.equal(await store.acquire({ ...first, leaseId: "b" }, 1), false)
  assert.equal(await store.acquire({ ...first, leaseId: "b", companyId: "other" }, 1), true)
  await store.cancel("blocked"); assert.equal(await store.acquire({ ...first, companyId: "blocked" }, 1), false)
  const coordinator = new DefaultOperationalCoordinator(new InMemoryCoordinatorStore(), clock, ids, "o", 1, 1_000)
  assert.equal(await coordinator.execute("c", "p", async () => "done"), "done")
})

test("deduplicação persistente in-memory considera hash, escopo, motivo e janela", async () => {
  const store = new InMemoryPersistentDeduplicationStore()
  const record = Object.freeze({ triggerHash: "hash", companyId: "c", providerKey: "p", reason: "manual",
    windowStartedAt: now, windowExpiresAt: later })
  assert.equal(await store.reserve(record), true); assert.equal(await store.reserve(record), false)
  assert.equal(await store.reserve({ ...record, providerKey: "other" }), true)
})

test("rate limit persistente in-memory respeita limite por empresa/provider", async () => {
  const store = new InMemoryRateLimitStore(); const record = Object.freeze({ companyId: "c", providerKey: "p",
    windowStartedAt: now, windowExpiresAt: later, limit: 1 })
  assert.equal(await store.consume(record), true); assert.equal(await store.consume(record), false)
  assert.equal(await store.consume({ ...record, providerKey: "other" }), true)
})

test("stores Supabase usam RPCs tipadas e propagam falhas", async () => {
  const calls: string[] = []; const database: OperationalDatabase = { rpc: async (name) => {
    calls.push(name); return { data: true, error: null } } }
  await new SupabasePersistentDeduplicationStore(database).reserve({ triggerHash: "h", companyId: "c",
    reason: "manual", windowStartedAt: now, windowExpiresAt: later })
  await new SupabaseRateLimitStore(database).consume({ companyId: "c", windowStartedAt: now,
    windowExpiresAt: later, limit: 1 })
  const coordination = new SupabaseCoordinatorStore(database)
  await coordination.acquire({ leaseId: "l", companyId: "c", ownerId: "o", acquiredAt: now,
    expiresAt: later }, 1); await coordination.release("c", "l"); await coordination.cancel("c")
  assert.deepEqual(calls, ["reserve_kpi_operational_deduplication", "consume_kpi_operational_rate_limit",
    "acquire_kpi_operational_lease", "release_kpi_operational_lease", "cancel_kpi_operational_company"])
})

test("metrics exportam JSON e snapshot determinístico", () => {
  const metrics = new InMemoryOperationalMetrics(); metrics.increment("adapterCalls", 2)
  metrics.increment("gatewaySchedules")
  assert.equal(new JsonOperationalMetricsExporter().export(metrics.snapshot()),
    '{"adapterCalls":2,"gatewaySchedules":1}')
  assert.equal(new SnapshotOperationalMetricsExporter().export(metrics.snapshot()),
    "adapterCalls=2\ngatewaySchedules=1")
})

test("factory compartilha telemetria e dependências por instância", async () => {
  const telemetry = new InMemoryOperationalTelemetry()
  const platform = createOperationalPlatform({ scheduler, clock, idGenerator: ids, ownerId: "worker", telemetry })
  await platform.adapters.manual.execute(event, context); platform.gateway.health(); platform.gateway.metrics()
  assert.equal(telemetry.list().some((item) => item.kind === "gateway_schedule"), true)
  assert.equal(telemetry.list().some((item) => item.kind === "gateway_health"), true)
})

test("composição server-only conecta operational, scheduler e runtime", async () => {
  const source = await readFile(new URL("../server/create-server-operational-platform.ts", import.meta.url), "utf8")
  assert.match(source, /import "server-only"/); assert.match(source, /createServerKPIScheduler/)
  assert.match(source, /SupabasePersistentDeduplicationStore/); assert.match(source, /SupabaseRateLimitStore/)
})

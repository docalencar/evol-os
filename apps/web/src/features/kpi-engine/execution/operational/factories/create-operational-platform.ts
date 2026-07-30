import type { Clock, IdGenerator } from "../../.."
import type { KPITriggerScheduler } from "../../scheduler"
import { DefaultApiOperationalAdapter, DefaultCronOperationalAdapter, DefaultManualOperationalAdapter,
  DefaultQueueOperationalAdapter, DefaultWebhookOperationalAdapter } from "../adapters"
import type { CoordinatorStore, OperationalMetrics, OperationalTelemetry,
  PersistentDeduplicationStore, RateLimitStore } from "../contracts"
import { DefaultOperationalCoordinator, InMemoryCoordinatorStore } from "../coordination"
import { DefaultOperationalGateway, InMemoryPersistentDeduplicationStore,
  InMemoryRateLimitStore, PersistentOperationalDeduplicator,
  PersistentOperationalRateLimiter } from "../gateway"
import { InMemoryOperationalMetrics } from "../metrics"
import { InMemoryOperationalTelemetry } from "../telemetry"

export function createOperationalPlatform(input: Readonly<{ scheduler: KPITriggerScheduler; clock: Clock
  idGenerator: IdGenerator; ownerId: string; concurrencyLimit?: number; leaseDurationMs?: number
  coordinatorStore?: CoordinatorStore; deduplicationStore?: PersistentDeduplicationStore
  rateLimitStore?: RateLimitStore; metrics?: OperationalMetrics; telemetry?: OperationalTelemetry }>) {
  const metrics = input.metrics ?? new InMemoryOperationalMetrics()
  const telemetry = input.telemetry ?? new InMemoryOperationalTelemetry()
  const coordinator = new DefaultOperationalCoordinator(input.coordinatorStore ?? new InMemoryCoordinatorStore(),
    input.clock, input.idGenerator, input.ownerId, input.concurrencyLimit ?? 1, input.leaseDurationMs ?? 30_000)
  const gateway = new DefaultOperationalGateway(input.scheduler, coordinator, input.clock, metrics, telemetry)
  const deduplicationStore = input.deduplicationStore ?? new InMemoryPersistentDeduplicationStore()
  const rateLimitStore = input.rateLimitStore ?? new InMemoryRateLimitStore()
  return Object.freeze({ gateway, coordinator, metrics, telemetry, deduplicationStore, rateLimitStore,
    deduplicator: new PersistentOperationalDeduplicator(deduplicationStore, input.clock, 30_000),
    rateLimiter: new PersistentOperationalRateLimiter(rateLimitStore, input.clock, 60_000, 30),
    adapters: Object.freeze({ manual: new DefaultManualOperationalAdapter(gateway, telemetry, metrics),
      cron: new DefaultCronOperationalAdapter(telemetry, metrics),
      queue: new DefaultQueueOperationalAdapter(telemetry, metrics),
      webhook: new DefaultWebhookOperationalAdapter(telemetry, metrics),
      api: new DefaultApiOperationalAdapter(telemetry, metrics) }) })
}

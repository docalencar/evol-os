import type { Clock, IdGenerator } from "../../.."
import type { KPIRuntimeInvoker, KPISchedulerMetrics, KPISchedulerTelemetry,
  KPITriggerRegistry } from "../contracts"
import { createDefaultKPISchedulerConfig, type KPISchedulerConfig,
  validateKPISchedulerConfig } from "../domain"
import { InMemoryKPISchedulerMetrics, InMemoryKPISchedulerTelemetry } from "../metrics"
import { ClockBasedKPIRateLimiter, DefaultSchedulePolicy, DeterministicKPIBackpressurePolicy,
  WindowedKPITriggerDeduplicator } from "../policies"
import { InMemoryKPITriggerRegistry } from "../registry"
import { DefaultKPITriggerScheduler } from "../runtime"

export function createKPIScheduler(input: Readonly<{ clock: Clock; idGenerator: IdGenerator
  invoker: KPIRuntimeInvoker; config?: KPISchedulerConfig; registry?: KPITriggerRegistry
  metrics?: KPISchedulerMetrics; telemetry?: KPISchedulerTelemetry }>) {
  const config = input.config ?? createDefaultKPISchedulerConfig(); validateKPISchedulerConfig(config)
  const metrics = input.metrics ?? new InMemoryKPISchedulerMetrics()
  const telemetry = input.telemetry ?? new InMemoryKPISchedulerTelemetry()
  const registry = input.registry ?? new InMemoryKPITriggerRegistry(telemetry)
  const policy = new DefaultSchedulePolicy(config, new DeterministicKPIBackpressurePolicy(config),
    new ClockBasedKPIRateLimiter(input.clock, config),
    new WindowedKPITriggerDeduplicator(input.clock, config))
  const scheduler = new DefaultKPITriggerScheduler(registry, policy, input.invoker, metrics,
    telemetry, input.idGenerator)
  return Object.freeze({ scheduler, registry, policy, metrics, telemetry, config })
}

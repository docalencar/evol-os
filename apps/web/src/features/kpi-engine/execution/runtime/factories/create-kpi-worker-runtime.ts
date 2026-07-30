import type { Clock, IdGenerator } from "../../.."
import type { ExecutionCoordinator } from "../../coordination"
import type { ExecutionDispatcher } from "../../dispatcher"
import type { KPIRecoveryRequestResolver, RecoveryCoordinator } from "../../recovery"
import type { KPIWorkerHeartbeat, KPIWorkerHealthService, KPIWorkerMetrics,
  KPIWorkerPollingStrategy, KPIWorkerRuntimeConfig, KPIWorkerTelemetry,
  KPIWorkerWorkDiscovery } from "../contracts"
import { InMemoryKPIWorkerMetrics, InMemoryKPIWorkerTelemetry } from "../metrics"
import { DefaultKPIWorkerController, DefaultKPIWorkerRuntime } from "../services"
import { createDefaultKPIWorkerRuntimeConfig, validateKPIWorkerRuntimeConfig } from "./kpi-worker-runtime-config"

export type CreateKPIWorkerRuntimeInput = Readonly<{
  companyId: string; providerKey?: string; workerId?: string; runtimeId?: string
  config?: KPIWorkerRuntimeConfig; discovery: KPIWorkerWorkDiscovery
  recovery: RecoveryCoordinator; resolver: KPIRecoveryRequestResolver
  dispatcher: ExecutionDispatcher; coordinator: ExecutionCoordinator; heartbeat: KPIWorkerHeartbeat
  polling: KPIWorkerPollingStrategy; health: KPIWorkerHealthService; metrics: KPIWorkerMetrics
  telemetry: KPIWorkerTelemetry; clock: Clock; idGenerator: IdGenerator
}>

export function createKPIWorkerRuntime(input: CreateKPIWorkerRuntimeInput): DefaultKPIWorkerRuntime {
  const config = input.config ?? createDefaultKPIWorkerRuntimeConfig(); validateKPIWorkerRuntimeConfig(config)
  return new DefaultKPIWorkerRuntime(Object.freeze({ workerId: input.workerId ?? input.idGenerator.generate(),
    runtimeId: input.runtimeId ?? input.idGenerator.generate(), companyId: input.companyId,
    providerKey: input.providerKey }), config, input.discovery, input.recovery, input.resolver,
    input.dispatcher, input.coordinator, input.heartbeat, input.polling, input.health,
    input.metrics, input.telemetry, input.clock, input.idGenerator)
}

export function createKPIWorkerController(runtime: DefaultKPIWorkerRuntime) {
  return new DefaultKPIWorkerController(runtime)
}

export function createInMemoryKPIWorkerRuntime(input: Omit<CreateKPIWorkerRuntimeInput,
  "metrics" | "telemetry">) {
  const metrics = new InMemoryKPIWorkerMetrics(); const telemetry = new InMemoryKPIWorkerTelemetry()
  const runtime = createKPIWorkerRuntime({ ...input, metrics, telemetry })
  return Object.freeze({ runtime, controller: createKPIWorkerController(runtime), metrics, telemetry })
}

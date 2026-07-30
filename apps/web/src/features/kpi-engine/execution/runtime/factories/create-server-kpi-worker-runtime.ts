import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import type { Clock, IdGenerator } from "../../.."
import type { KPIExecutionTelemetry } from "../../contracts"
import { createKPIRecoveryOrchestration } from "../../factories"
import { SupabaseExecutionLeaseRepository } from "../../leases"
import type { KPIRetryPolicy } from "../../policies"
import type { KPIRecoveryRequestResolver } from "../../recovery"
import { SupabaseKPIExecutionRepository, type KPIExecutionDatabase } from "../../repositories"
import type { KPIExecutionPlatform } from "../../services"
import { DefaultKPIWorkerHealthService } from "../health"
import { CoordinatedKPIWorkerHeartbeat } from "../heartbeat"
import { InMemoryKPIWorkerMetrics, InMemoryKPIWorkerTelemetry } from "../metrics"
import { AdaptiveKPIWorkerPollingStrategy, DefaultKPIWorkerWorkPriority,
  RepositoryKPIWorkerWorkDiscovery } from "../polling"
import { createKPIWorkerController, createKPIWorkerRuntime } from "./create-kpi-worker-runtime"
import { createDefaultKPIWorkerRuntimeConfig } from "./kpi-worker-runtime-config"

export async function createServerKPIWorkerRuntime(input: Readonly<{
  companyId: string; providerKey?: string; workerId?: string; runtimeId?: string
  platform: KPIExecutionPlatform; retryPolicy: KPIRetryPolicy
  requestResolver: KPIRecoveryRequestResolver; executionTelemetry: KPIExecutionTelemetry
  clock: Clock; idGenerator: IdGenerator
}>) {
  const client = await createServerDatabase()
  const database = client as unknown as KPIExecutionDatabase
  const executions = new SupabaseKPIExecutionRepository(database)
  const leases = new SupabaseExecutionLeaseRepository(database, input.clock)
  const config = createDefaultKPIWorkerRuntimeConfig()
  const workerId = input.workerId ?? input.idGenerator.generate()
  const orchestration = createKPIRecoveryOrchestration({ leases, platform: input.platform,
    retryPolicy: input.retryPolicy, requestResolver: input.requestResolver,
    telemetry: input.executionTelemetry, clock: input.clock, idGenerator: input.idGenerator,
    ownerId: workerId, leaseDurationMs: config.leaseDurationMs })
  const metrics = new InMemoryKPIWorkerMetrics(); const telemetry = new InMemoryKPIWorkerTelemetry()
  const discovery = new RepositoryKPIWorkerWorkDiscovery(executions, leases,
    new DefaultKPIWorkerWorkPriority())
  const context = Object.freeze({ workerId, runtimeId: input.runtimeId ?? input.idGenerator.generate(),
    companyId: input.companyId, providerKey: input.providerKey })
  const heartbeat = new CoordinatedKPIWorkerHeartbeat(orchestration.coordinator, input.clock,
    config.leaseRenewalThresholdMs, context, metrics, telemetry)
  const runtime = createKPIWorkerRuntime({ ...input, ...context, config, discovery,
    recovery: orchestration.recovery, resolver: input.requestResolver,
    dispatcher: orchestration.dispatcher, coordinator: orchestration.coordinator, heartbeat,
    polling: new AdaptiveKPIWorkerPollingStrategy(config),
    health: new DefaultKPIWorkerHealthService(input.clock, config), metrics, telemetry })
  return Object.freeze({ runtime, controller: createKPIWorkerController(runtime), metrics, telemetry })
}

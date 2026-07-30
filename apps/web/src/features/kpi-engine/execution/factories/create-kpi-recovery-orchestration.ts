import type { Clock, IdGenerator } from "../.."
import type { KPIExecutionTelemetry } from "../contracts"
import { ExecutionCoordinator } from "../coordination"
import { ExecutionDispatcher } from "../dispatcher"
import type { ExecutionLeaseRepository } from "../leases"
import type { KPIRetryPolicy } from "../policies"
import { RecoveryCoordinator, type KPIRecoveryRequestResolver } from "../recovery"
import type { KPIExecutionPlatform } from "../services"

export function createKPIRecoveryOrchestration(input: Readonly<{
  leases: ExecutionLeaseRepository
  platform: KPIExecutionPlatform
  retryPolicy: KPIRetryPolicy
  requestResolver: KPIRecoveryRequestResolver
  telemetry: KPIExecutionTelemetry
  clock: Clock
  idGenerator: IdGenerator
  ownerId: string
  leaseDurationMs: number
}>) {
  const coordinator = new ExecutionCoordinator(input.leases, input.telemetry, input.clock,
    input.idGenerator, input.ownerId, input.leaseDurationMs)
  const dispatcher = new ExecutionDispatcher(input.platform, input.telemetry, input.clock)
  const recovery = new RecoveryCoordinator(input.leases, coordinator, dispatcher,
    input.requestResolver, input.retryPolicy, input.telemetry, input.clock)
  return Object.freeze({ coordinator, dispatcher, recovery })
}

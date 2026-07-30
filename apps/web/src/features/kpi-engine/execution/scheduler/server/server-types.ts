import type { Clock, IdGenerator } from "../../.."
import type { KPIExecutionTelemetry } from "../../contracts"
import type { KPIRetryPolicy } from "../../policies"
import type { KPIRecoveryRequestResolver } from "../../recovery"
import type { KPIExecutionPlatform } from "../../services"

export type ParametersOfCreateServerWorker = Readonly<{ companyId: string; providerKey?: string
  workerId?: string; runtimeId?: string; platform: KPIExecutionPlatform; retryPolicy: KPIRetryPolicy
  requestResolver: KPIRecoveryRequestResolver; executionTelemetry: KPIExecutionTelemetry
  clock: Clock; idGenerator: IdGenerator }>

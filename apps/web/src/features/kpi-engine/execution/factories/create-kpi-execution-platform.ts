import type { Clock, IdGenerator } from "../.."
import type { KPIExecutionExecutor, KPIExecutionPolicy, KPIExecutionTelemetry } from "../contracts"
import { KPIExecutionPipeline } from "../pipeline"
import { InMemoryKPIExecutionPolicy } from "../policies"
import { KPIExecutionPlatform } from "../services"
import { NoopKPIExecutionTelemetry } from "../telemetry"

export type CreateKPIExecutionPlatformInput = Readonly<{
  executors: readonly KPIExecutionExecutor[]
  clock: Clock
  idGenerator: IdGenerator
  policy?: KPIExecutionPolicy
  telemetry?: KPIExecutionTelemetry
}>

export function createKPIExecutionPlatform(input: CreateKPIExecutionPlatformInput): KPIExecutionPlatform {
  return new KPIExecutionPlatform(new KPIExecutionPipeline(input.executors,
    input.policy ?? new InMemoryKPIExecutionPolicy(),
    input.telemetry ?? new NoopKPIExecutionTelemetry(), input.clock, input.idGenerator))
}

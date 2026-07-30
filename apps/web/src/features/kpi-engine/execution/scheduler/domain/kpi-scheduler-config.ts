import { KPISchedulerError } from "./kpi-scheduler-error"

export type KPISchedulerConfig = Readonly<{ maxConcurrentExecutions: number; minimumWindowMs: number
  deduplicationWindowMs: number; rateLimitWindowMs: number; maxRequestsPerWindow: number
  backpressureQueueThreshold: number; backpressureLeaseThreshold: number
  backpressureFailureThreshold: number; backpressureDelayMs: number }>
export function createDefaultKPISchedulerConfig(): KPISchedulerConfig { return Object.freeze({
  maxConcurrentExecutions: 1, minimumWindowMs: 1_000, deduplicationWindowMs: 30_000,
  rateLimitWindowMs: 60_000, maxRequestsPerWindow: 30, backpressureQueueThreshold: 100,
  backpressureLeaseThreshold: 20, backpressureFailureThreshold: 3, backpressureDelayMs: 5_000,
}) }
export function validateKPISchedulerConfig(config: KPISchedulerConfig): void {
  if (Object.values(config).some((value) => !Number.isInteger(value) || value < 0) ||
    config.maxConcurrentExecutions < 1 || config.maxRequestsPerWindow < 1) {
    throw new KPISchedulerError("INVALID_SCHEDULER_CONFIG", "Configuração do scheduler inválida.")
  }
}

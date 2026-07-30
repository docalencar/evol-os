import type { KPIWorkerRuntimeConfig } from "../contracts"
import { KPIWorkerError } from "../domain"

export function createDefaultKPIWorkerRuntimeConfig(): KPIWorkerRuntimeConfig {
  return Object.freeze({ batchSize: 30, maxRecoveriesPerCycle: 10, maxRetriesPerCycle: 10,
    maxPendingPerCycle: 10, leaseDurationMs: 60_000, leaseRenewalThresholdMs: 15_000,
    maxConsecutiveFailures: 5, emptyCycleDelayMs: 1_000, failureBackoffBaseMs: 500,
    failureBackoffMaxMs: 30_000, shutdownGracePeriodMs: 30_000 })
}
export function validateKPIWorkerRuntimeConfig(config: KPIWorkerRuntimeConfig): void {
  for (const value of Object.values(config)) {
    if (!Number.isInteger(value) || value <= 0) throw new KPIWorkerError(
      "INVALID_RUNTIME_CONFIGURATION", "Configurações devem ser inteiros positivos.")
  }
  if (config.leaseRenewalThresholdMs >= config.leaseDurationMs ||
    config.failureBackoffBaseMs > config.failureBackoffMaxMs ||
    config.maxRecoveriesPerCycle + config.maxRetriesPerCycle + config.maxPendingPerCycle > config.batchSize) {
    throw new KPIWorkerError("INVALID_RUNTIME_CONFIGURATION", "Limites de configuração incoerentes.")
  }
}

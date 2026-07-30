import type { KPIWorkerPollingDecision, KPIWorkerPollingStrategy, KPIWorkerRuntimeConfig } from "../contracts"

export class AdaptiveKPIWorkerPollingStrategy implements KPIWorkerPollingStrategy {
  constructor(private readonly config: KPIWorkerRuntimeConfig) {}
  decide(input: Parameters<KPIWorkerPollingStrategy["decide"]>[0]): KPIWorkerPollingDecision {
    if (input.cancelled || input.runtimeStatus !== "running") return decision("stop", 0, "runtime_not_running")
    if (input.hadError) {
      const multiplier = 2 ** Math.max(0, input.consecutiveFailures - 1)
      return decision("backoff", Math.min(this.config.failureBackoffMaxMs,
        this.config.failureBackoffBaseMs * multiplier), "consecutive_failure")
    }
    if (input.hadWork || input.hadRecovery) return decision("run_immediately", 0, "work_available")
    if (input.leaseContention) return decision("wait", this.config.emptyCycleDelayMs, "lease_contention")
    return decision("wait", this.config.emptyCycleDelayMs * Math.max(1,
      Math.min(input.consecutiveEmptyCycles, 5)), "empty_cycle")
  }
}
function decision(decisionValue: KPIWorkerPollingDecision["decision"], delayMs: number,
  reason: string): KPIWorkerPollingDecision {
  return Object.freeze({ decision: decisionValue, delayMs, reason })
}

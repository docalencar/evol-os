import type { Clock } from "../../.."
import type { KPIWorkerHealthDTO, KPIWorkerHealthService, KPIWorkerRuntimeConfig,
  KPIWorkerRuntimeState } from "../contracts"

export class DefaultKPIWorkerHealthService implements KPIWorkerHealthService {
  constructor(private readonly clock: Clock, private readonly config: KPIWorkerRuntimeConfig) {}
  getHealth(state: KPIWorkerRuntimeState, activeLeaseCount: number,
    cancellationRequested: boolean): KPIWorkerHealthDTO {
    const reasons: string[] = []
    let status: KPIWorkerHealthDTO["status"] = "healthy"
    if (state.status === "stopped" || state.status === "idle") status = "stopped"
    else if (state.status === "failed" || state.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      status = "unhealthy"; reasons.push("runtime_failed")
    } else if (state.status !== "running" || state.consecutiveFailures > 0 || cancellationRequested) {
      status = "degraded"
      if (state.consecutiveFailures > 0) reasons.push("consecutive_failures")
      if (cancellationRequested) reasons.push("cancellation_requested")
    }
    return Object.freeze({ status, checkedAt: this.clock.now(), lastCycleAt: state.lastCycleAt,
      lastSuccessfulCycleAt: state.lastSuccessfulCycleAt, consecutiveFailures: state.consecutiveFailures,
      activeLeaseCount, reasonCodes: Object.freeze(reasons) })
  }
}

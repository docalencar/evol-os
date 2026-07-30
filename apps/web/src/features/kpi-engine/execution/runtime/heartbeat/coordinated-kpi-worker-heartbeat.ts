import type { Clock } from "../../.."
import type { ExecutionCoordinator } from "../../coordination"
import type { KPIWorkerCancellationToken, KPIWorkerHeartbeat, KPIWorkerMetrics,
  KPIWorkerRuntimeContext, KPIWorkerTelemetry } from "../contracts"
import { KPIWorkerError } from "../domain"

export class CoordinatedKPIWorkerHeartbeat implements KPIWorkerHeartbeat {
  constructor(private readonly coordinator: ExecutionCoordinator, private readonly clock: Clock,
    private readonly thresholdMs: number, private readonly context: KPIWorkerRuntimeContext,
    private readonly metrics: KPIWorkerMetrics, private readonly telemetry: KPIWorkerTelemetry) {
    if (!Number.isInteger(thresholdMs) || thresholdMs <= 0) throw new KPIWorkerError(
      "INVALID_RUNTIME_CONFIGURATION", "Threshold de heartbeat inválido.")
  }
  async runHeartbeat(companyId: string, leases: Parameters<KPIWorkerHeartbeat["runHeartbeat"]>[1],
    token: KPIWorkerCancellationToken) {
    token.throwIfCancellationRequested()
    const startedAt = this.clock.now(); await this.emit("heartbeat_started", startedAt, 0, 0)
    let renewed = 0; let lost = 0
    for (const lease of leases) {
      token.throwIfCancellationRequested()
      if (lease.ownerId !== this.context.workerId ||
        lease.expiresAt.getTime() - startedAt.getTime() > this.thresholdMs) continue
      if (await this.coordinator.renew(companyId, lease)) { renewed += 1; this.metrics.increment("leasesRenewed") }
      else { lost += 1; this.metrics.increment("leasesLost"); await this.emit("lease_lost", this.clock.now(), renewed, lost) }
    }
    await this.emit(lost > 0 ? "heartbeat_failed" : "heartbeat_completed", this.clock.now(), renewed, lost)
    if (lost > 0) throw new KPIWorkerError("LEASE_LOST", "Lease perdida durante heartbeat.")
    return Object.freeze({ renewed, lost })
  }
  private async emit(kind: string, at: Date, renewed: number, lost: number) {
    await this.telemetry.record(Object.freeze({ kind, ...this.context, durationMs: 0,
      counts: { renewed, lost }, status: kind }))
    void at
  }
}

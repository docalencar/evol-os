import type { Clock, IdGenerator } from "../.."
import type { KPIExecutionTelemetry } from "../contracts"
import {
  acquireExecutionLease, isExecutionLeaseExpired, renewExecutionLease,
  stealExpiredExecutionLease, type ExecutionLease, type ExecutionLeaseRepository,
} from "../leases"

export class ExecutionCoordinator {
  constructor(private readonly leases: ExecutionLeaseRepository,
    private readonly telemetry: KPIExecutionTelemetry, private readonly clock: Clock,
    private readonly ids: IdGenerator, private readonly ownerId: string,
    private readonly durationMs: number) {}

  async acquire(companyId: string, executionId: string): Promise<ExecutionLease | null> {
    const at = this.clock.now()
    const candidate = acquireExecutionLease({ executionId, ownerId: this.ownerId,
      leaseId: this.ids.generate(), acquiredAt: at, durationMs: this.durationMs })
    const current = await this.leases.find(companyId, executionId)
    let acquired = false
    let lease = candidate
    if (!current) acquired = await this.leases.acquire(companyId, candidate)
    else if (isExecutionLeaseExpired(current, at)) {
      lease = stealExpiredExecutionLease(current, { ownerId: this.ownerId,
        leaseId: candidate.leaseId, acquiredAt: at, durationMs: this.durationMs })
      acquired = await this.leases.steal(companyId, lease)
      await this.emit("lease_expired", companyId, executionId, current, at)
    }
    if (!acquired) return null
    await this.emit("lease_acquired", companyId, executionId, lease, at)
    return lease
  }

  async renew(companyId: string, lease: ExecutionLease): Promise<ExecutionLease | null> {
    const at = this.clock.now()
    const renewed = renewExecutionLease(lease, this.ownerId, at, this.durationMs)
    if (!await this.leases.renew(companyId, renewed)) return null
    await this.emit("lease_renewed", companyId, lease.executionId, renewed, at)
    return renewed
  }

  async release(companyId: string, lease: ExecutionLease): Promise<boolean> {
    const released = await this.leases.release(companyId, lease.executionId, this.ownerId, lease.leaseId)
    if (released) await this.emit("lease_released", companyId, lease.executionId, lease, this.clock.now())
    return released
  }

  private async emit(kind: "lease_acquired" | "lease_renewed" | "lease_released" | "lease_expired",
    companyId: string, executionId: string, lease: ExecutionLease, at: Date): Promise<void> {
    await this.telemetry.record(Object.freeze({ executionId, attemptId: lease.leaseId,
      companyId, providerKey: "coordination", correlationId: lease.ownerId,
      idempotencyKey: lease.leaseId, status: kind, kind, startedAt: at, finishedAt: at,
      durationMs: 0, kpiCount: 0, succeeded: 0, failed: 0, persisted: 0 }))
  }
}

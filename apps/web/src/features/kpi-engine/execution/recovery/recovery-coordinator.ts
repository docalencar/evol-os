import type { Clock } from "../.."
import type { KPIExecutionTelemetry } from "../contracts"
import type { ExecutionCoordinator } from "../coordination"
import type { DispatchRequest, ExecutionDispatcher } from "../dispatcher"
import type { KPIExecution } from "../domain"
import type { ExecutionLeaseRepository } from "../leases"
import type { KPIRetryPolicy } from "../policies"
import type { KPIExecutionPage } from "../repositories"

export interface KPIRecoveryRequestResolver {
  resolve(execution: KPIExecution): Promise<DispatchRequest | null>
}

export type KPIRecoveryResult = Readonly<{
  executionId: string
  status: "recovered" | "interrupted" | "failed" | "skipped"
}>

export class RecoveryCoordinator {
  constructor(private readonly leases: ExecutionLeaseRepository,
    private readonly coordinator: ExecutionCoordinator, private readonly dispatcher: ExecutionDispatcher,
    private readonly resolver: KPIRecoveryRequestResolver, private readonly retry: KPIRetryPolicy,
    private readonly telemetry: KPIExecutionTelemetry, private readonly clock: Clock) {}

  async recover(companyId: string, page: KPIExecutionPage): Promise<readonly KPIRecoveryResult[]> {
    const at = this.clock.now()
    const abandoned = await this.leases.listExpiredRunning(companyId, at, page)
    const results: KPIRecoveryResult[] = []
    for (const execution of abandoned) results.push(await this.recoverOne(execution))
    return Object.freeze(results)
  }

  private async recoverOne(execution: KPIExecution): Promise<KPIRecoveryResult> {
    const startedAt = this.clock.now()
    await this.emit("recovery_started", execution, startedAt, startedAt, 0, 0)
    const lease = await this.coordinator.acquire(execution.companyId, execution.id)
    if (!lease) return this.finish(execution, "skipped", startedAt, 0, 1)
    const retry = this.retry.decide({ attemptCount: execution.attemptCount,
      errorCode: "lease_expired", explicit: false })
    if (!retry.retry) {
      await this.leases.recover(execution.companyId, execution.id, lease.ownerId, lease.leaseId,
        this.clock.now(), false)
      await this.coordinator.release(execution.companyId, lease)
      return this.finish(execution, "interrupted", startedAt, 0, 1)
    }
    const request = await this.resolver.resolve(execution)
    if (!request) {
      await this.leases.recover(execution.companyId, execution.id, lease.ownerId,
        lease.leaseId, this.clock.now(), false)
      await this.coordinator.release(execution.companyId, lease)
      return this.finish(execution, "interrupted", startedAt, 0, 1)
    }
    if (!await this.leases.recover(execution.companyId, execution.id,
      lease.ownerId, lease.leaseId, this.clock.now(), true)) {
      await this.coordinator.release(execution.companyId, lease)
      return this.finish(execution, "failed", startedAt, 0, 1)
    }
    const result = await this.dispatcher.dispatch(request)
    await this.coordinator.release(execution.companyId, lease)
    const recovered = result.status === "succeeded" || result.status === "partial"
    return this.finish(execution, recovered ? "recovered" : "failed", startedAt,
      recovered ? 1 : 0, recovered ? 0 : 1)
  }

  private async finish(execution: KPIExecution, status: KPIRecoveryResult["status"],
    startedAt: Date, succeeded: number, failed: number): Promise<KPIRecoveryResult> {
    const finishedAt = this.clock.now()
    await this.emit(status === "recovered" ? "recovery_completed" : "recovery_failed",
      execution, startedAt, finishedAt, succeeded, failed)
    return Object.freeze({ executionId: execution.id, status })
  }

  private async emit(kind: "recovery_started" | "recovery_completed" | "recovery_failed",
    execution: KPIExecution, startedAt: Date, finishedAt: Date, succeeded: number, failed: number) {
    await this.telemetry.record(Object.freeze({ executionId: execution.id, companyId: execution.companyId,
      providerKey: execution.providerKey, correlationId: execution.correlationId,
      idempotencyKey: execution.idempotencyKey, status: kind, kind, startedAt, finishedAt,
      durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      kpiCount: 1, succeeded, failed, persisted: succeeded }))
  }
}

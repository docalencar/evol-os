import { failKPIExecution, interruptKPIExecution, type KPIExecution } from "../domain"
import type { KPIExecutionAttemptRepository, KPIExecutionPage, KPIExecutionRepository } from "../repositories"
import type { ExecutionLease } from "./execution-lease"

export interface ExecutionLeaseRepository {
  acquire(companyId: string, lease: ExecutionLease): Promise<boolean>
  renew(companyId: string, lease: ExecutionLease): Promise<boolean>
  release(companyId: string, executionId: string, ownerId: string, leaseId: string): Promise<boolean>
  find(companyId: string, executionId: string): Promise<ExecutionLease | null>
  steal(companyId: string, lease: ExecutionLease): Promise<boolean>
  listExpiredRunning(companyId: string, expiredAt: Date,
    page: KPIExecutionPage): Promise<readonly KPIExecution[]>
  recover(companyId: string, executionId: string, ownerId: string, leaseId: string,
    recoveredAt: Date, retryAllowed: boolean): Promise<boolean>
}

export class InMemoryExecutionLeaseRepository implements ExecutionLeaseRepository {
  private readonly leases = new Map<string, ExecutionLease>()
  constructor(private readonly executions: KPIExecutionRepository,
    private readonly attempts?: KPIExecutionAttemptRepository) {}
  async acquire(companyId: string, lease: ExecutionLease) {
    void companyId
    if (this.leases.has(lease.executionId)) return false
    this.leases.set(lease.executionId, lease); return true
  }
  async renew(companyId: string, lease: ExecutionLease) {
    void companyId
    const current = this.leases.get(lease.executionId)
    if (!current || current.leaseId !== lease.leaseId || current.ownerId !== lease.ownerId) return false
    this.leases.set(lease.executionId, lease); return true
  }
  async release(companyId: string, executionId: string, ownerId: string, leaseId: string) {
    void companyId
    const current = this.leases.get(executionId)
    if (!current || current.ownerId !== ownerId || current.leaseId !== leaseId) return false
    this.leases.delete(executionId); return true
  }
  async find(companyId: string, executionId: string) { void companyId; return this.leases.get(executionId) ?? null }
  async steal(companyId: string, lease: ExecutionLease) { void companyId; this.leases.set(lease.executionId, lease); return true }
  async listExpiredRunning(companyId: string, expiredAt: Date, page: KPIExecutionPage) {
    const running = await this.executions.list({ companyId, status: "running", page })
    return Object.freeze(running.filter((execution) => {
      const lease = this.leases.get(execution.id)
      return lease !== undefined && lease.expiresAt.getTime() <= expiredAt.getTime()
    }))
  }
  async recover(companyId: string, executionId: string, ownerId: string, leaseId: string,
    recoveredAt: Date, retryAllowed: boolean) {
    const lease = this.leases.get(executionId)
    if (!lease || lease.ownerId !== ownerId || lease.leaseId !== leaseId) return false
    const execution = await this.executions.findById(companyId, executionId)
    if (!execution || execution.status !== "running") return false
    await this.executions.save(retryAllowed
      ? failKPIExecution(execution, { code: "lease_expired" }, recoveredAt)
      : interruptKPIExecution(execution, recoveredAt))
    if (this.attempts) {
      const items = await this.attempts.listByExecution(executionId,
        { limit: Math.max(1, execution.attemptCount), offset: 0 })
      const running = items.find((attempt) => attempt.status === "running")
      if (running) await this.attempts.save(Object.freeze({ ...running,
        status: retryAllowed ? "failed" as const : "interrupted" as const,
        failedAt: retryAllowed ? recoveredAt : null,
        errorSnapshot: { code: "lease_expired" } }))
    }
    return true
  }
}

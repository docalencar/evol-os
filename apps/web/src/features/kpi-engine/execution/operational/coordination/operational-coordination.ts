import type { Clock, IdGenerator } from "../../.."
import type { CoordinatorLease, CoordinatorState, CoordinatorStore, OperationalCoordinator } from "../contracts"

export class InMemoryCoordinatorStore implements CoordinatorStore {
  private readonly leases = new Map<string, CoordinatorLease>(); private readonly cancelled = new Set<string>()
  async acquire(lease: CoordinatorLease, limit: number): Promise<boolean> {
    if (this.cancelled.has(lease.companyId)) return false
    const active = [...this.leases.values()].filter((item) => item.companyId === lease.companyId &&
      item.providerKey === lease.providerKey &&
      item.expiresAt.getTime() > lease.acquiredAt.getTime()).length
    if (active >= limit) return false
    this.leases.set(`${lease.companyId}:${lease.leaseId}`, Object.freeze({ ...lease })); return true
  }
  async release(companyId: string, leaseId: string): Promise<void> { this.leases.delete(`${companyId}:${leaseId}`) }
  async cancel(companyId: string): Promise<void> { this.cancelled.add(companyId) }
  async isCancelled(companyId: string): Promise<boolean> { return this.cancelled.has(companyId) }
  async state(): Promise<CoordinatorState> { return Object.freeze({ active: this.leases.size,
    cancelledCompanies: Object.freeze([...this.cancelled].sort()) }) }
}
export class DefaultOperationalCoordinator implements OperationalCoordinator {
  private current: CoordinatorState = Object.freeze({ active: 0, cancelledCompanies: [] })
  constructor(private readonly store: CoordinatorStore, private readonly clock: Clock,
    private readonly ids: IdGenerator, private readonly ownerId: string, private readonly limit: number,
    private readonly leaseDurationMs: number) {}
  async execute<T>(companyId: string, providerKey: string | undefined, operation: () => Promise<T>): Promise<T> {
    const acquiredAt = this.clock.now(); const expiresAt = structuredClone(acquiredAt)
    expiresAt.setTime(acquiredAt.getTime() + this.leaseDurationMs)
    const lease: CoordinatorLease = Object.freeze({ leaseId: this.ids.generate(),
      companyId, providerKey, ownerId: this.ownerId, acquiredAt,
      expiresAt })
    if (!await this.store.acquire(lease, this.limit)) throw new Error("OPERATIONAL_COORDINATION_REJECTED")
    this.current = await this.store.state()
    try { return await operation() } finally {
      await this.store.release(companyId, lease.leaseId); this.current = await this.store.state()
    }
  }
  async cancel(companyId: string): Promise<void> { await this.store.cancel(companyId); this.current = await this.store.state() }
  state(): CoordinatorState { return this.current }
}

import type { CoordinatorLease, CoordinatorState, CoordinatorStore, OperationalDatabase } from "../contracts"

export class SupabaseCoordinatorStore implements CoordinatorStore {
  constructor(private readonly database: OperationalDatabase) {}
  async acquire(lease: CoordinatorLease, limit: number): Promise<boolean> {
    const { data, error } = await this.database.rpc("acquire_kpi_operational_lease", { p_company_id: lease.companyId,
      p_provider_key: lease.providerKey ?? null, p_owner_id: lease.ownerId, p_lease_id: lease.leaseId,
      p_acquired_at: lease.acquiredAt.toISOString(), p_expires_at: lease.expiresAt.toISOString(), p_limit: limit })
    if (error) throw new Error(error.message); return data === true
  }
  async release(companyId: string, leaseId: string): Promise<void> {
    const { error } = await this.database.rpc("release_kpi_operational_lease", {
      p_company_id: companyId, p_lease_id: leaseId }); if (error) throw new Error(error.message)
  }
  async cancel(companyId: string): Promise<void> { const { error } = await this.database.rpc(
    "cancel_kpi_operational_company", { p_company_id: companyId }); if (error) throw new Error(error.message) }
  async isCancelled(companyId: string): Promise<boolean> { const { data, error } = await this.database.rpc(
    "is_kpi_operational_company_cancelled", { p_company_id: companyId }); if (error) throw new Error(error.message)
    return data === true }
  async state(): Promise<CoordinatorState> { const { data, error } = await this.database.rpc(
    "get_kpi_operational_coordinator_state", {}); if (error) throw new Error(error.message)
    if (!isCoordinatorState(data)) throw new Error("KPI_OPERATIONAL_COORDINATOR_STATE_INVALID")
    return Object.freeze({ active: data.active,
      cancelledCompanies: Object.freeze([...data.cancelledCompanies].sort()) }) }
}
function isCoordinatorState(value: unknown): value is { active: number; cancelledCompanies: string[] } {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return typeof record.active === "number" && Array.isArray(record.cancelledCompanies) &&
    record.cancelledCompanies.every((item) => typeof item === "string")
}

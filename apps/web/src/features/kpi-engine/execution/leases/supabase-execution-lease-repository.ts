import { z } from "zod"

import type { Clock } from "../.."
import type { KPIExecutionPage } from "../repositories"
import { mapPersistedKPIExecution, type KPIExecutionDatabase } from "../repositories"
import type { ExecutionLease } from "./execution-lease"
import type { ExecutionLeaseRepository } from "./execution-lease-repository"

const leaseSchema = z.object({ id: z.string(), lease_owner: z.string().nullable(),
  lease_id: z.string().nullable(), lease_acquired_at: z.coerce.date().nullable(),
  lease_expires_at: z.coerce.date().nullable(), lease_renewed_at: z.coerce.date().nullable() })

export class SupabaseExecutionLeaseRepository implements ExecutionLeaseRepository {
  constructor(private readonly database: KPIExecutionDatabase, private readonly clock: Clock) {}
  acquire(companyId: string, lease: ExecutionLease) { return this.acquireOrSteal(companyId, lease) }
  renew(companyId: string, lease: ExecutionLease) {
    return this.booleanRpc("renew_execution_lease", { p_company_id: companyId,
      p_execution_id: lease.executionId, p_owner_id: lease.ownerId, p_lease_id: lease.leaseId,
      p_renewed_at: lease.renewedAt?.toISOString(), p_expires_at: lease.expiresAt.toISOString() })
  }
  release(companyId: string, executionId: string, ownerId: string, leaseId: string) {
    return this.booleanRpc("release_execution_lease", { p_company_id: companyId,
      p_execution_id: executionId, p_owner_id: ownerId, p_lease_id: leaseId,
      p_released_at: this.clock.now().toISOString() })
  }
  async find(companyId: string, executionId: string) {
    const { data, error } = await this.database.from("kpi_executions")
      .select("id, lease_owner, lease_id, lease_acquired_at, lease_expires_at, lease_renewed_at")
      .eq("company_id", companyId).eq("id", executionId).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return null
    const row = leaseSchema.parse(data)
    if (!row.lease_owner || !row.lease_id || !row.lease_expires_at) return null
    return Object.freeze({ executionId: row.id, ownerId: row.lease_owner, leaseId: row.lease_id,
      acquiredAt: row.lease_acquired_at ?? row.lease_renewed_at ?? row.lease_expires_at,
      expiresAt: row.lease_expires_at, renewedAt: row.lease_renewed_at })
  }
  steal(companyId: string, lease: ExecutionLease) { return this.acquireOrSteal(companyId, lease) }
  async listExpiredRunning(companyId: string, expiredAt: Date, page: KPIExecutionPage) {
    const { data, error } = await this.database.from("kpi_executions").select("*")
      .eq("company_id", companyId).eq("status", "running")
      .lte("lease_expires_at", expiredAt.toISOString()).order("lease_expires_at", { ascending: true })
      .order("id", { ascending: true }).range(page.offset, page.offset + Math.max(0, page.limit - 1))
    if (error) throw new Error(error.message)
    if (!Array.isArray(data)) throw new Error("KPI_EXECUTION_RECOVERY_DATA_INVALID")
    return Object.freeze(data.map(mapPersistedKPIExecution))
  }
  recover(companyId: string, executionId: string, ownerId: string, leaseId: string,
    recoveredAt: Date, retryAllowed: boolean) {
    return this.booleanRpc("recover_execution", { p_company_id: companyId,
      p_execution_id: executionId, p_owner_id: ownerId, p_lease_id: leaseId,
      p_recovered_at: recoveredAt.toISOString(), p_retry_allowed: retryAllowed })
  }
  private acquireOrSteal(companyId: string, lease: ExecutionLease) {
    return this.booleanRpc("acquire_execution_lease", { p_company_id: companyId,
      p_execution_id: lease.executionId, p_owner_id: lease.ownerId, p_lease_id: lease.leaseId,
      p_acquired_at: lease.acquiredAt.toISOString(), p_expires_at: lease.expiresAt.toISOString() })
  }
  private async booleanRpc(name: string, parameters: Readonly<Record<string, unknown>>) {
    const { data, error } = await this.database.rpc(name, parameters)
    if (error) throw new Error(error.message)
    return data === true
  }
}

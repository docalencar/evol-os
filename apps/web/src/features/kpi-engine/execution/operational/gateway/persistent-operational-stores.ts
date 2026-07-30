import type { Clock } from "../../.."
import type { KPITriggerRequest } from "../../scheduler"
import type { DeduplicationRecord, OperationalDatabase, PersistentDeduplicationStore,
  RateLimitRecord, RateLimitStore } from "../contracts"

export class InMemoryPersistentDeduplicationStore implements PersistentDeduplicationStore {
  private readonly records = new Map<string, DeduplicationRecord>()
  async reserve(record: DeduplicationRecord): Promise<boolean> {
    const key = `${record.companyId}:${record.providerKey ?? "*"}:${record.triggerHash}:${record.reason}`
    const existing = this.records.get(key)
    if (existing && existing.windowExpiresAt.getTime() > record.windowStartedAt.getTime()) return false
    this.records.set(key, Object.freeze({ ...record })); return true
  }
}
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly counts = new Map<string, Readonly<{ count: number; expiresAt: Date }>>()
  async consume(record: RateLimitRecord): Promise<boolean> {
    const key = `${record.companyId}:${record.providerKey ?? "*"}`; const current = this.counts.get(key)
    const active = current && current.expiresAt.getTime() > record.windowStartedAt.getTime() ? current.count : 0
    if (active >= record.limit) return false
    this.counts.set(key, Object.freeze({ count: active + 1, expiresAt: record.windowExpiresAt })); return true
  }
}
export class SupabasePersistentDeduplicationStore implements PersistentDeduplicationStore {
  constructor(private readonly database: OperationalDatabase) {}
  async reserve(record: DeduplicationRecord): Promise<boolean> {
    const { data, error } = await this.database.rpc("reserve_kpi_operational_deduplication", {
      p_trigger_hash: record.triggerHash, p_company_id: record.companyId,
      p_provider_key: record.providerKey ?? null, p_reason: record.reason,
      p_window_started_at: record.windowStartedAt.toISOString(),
      p_window_expires_at: record.windowExpiresAt.toISOString() })
    if (error) throw new Error(error.message); return data === true
  }
}
export class SupabaseRateLimitStore implements RateLimitStore {
  constructor(private readonly database: OperationalDatabase) {}
  async consume(record: RateLimitRecord): Promise<boolean> {
    const { data, error } = await this.database.rpc("consume_kpi_operational_rate_limit", {
      p_company_id: record.companyId, p_provider_key: record.providerKey ?? null,
      p_window_started_at: record.windowStartedAt.toISOString(),
      p_window_expires_at: record.windowExpiresAt.toISOString(), p_limit: record.limit })
    if (error) throw new Error(error.message); return data === true
  }
}
export class PersistentOperationalDeduplicator {
  constructor(private readonly store: PersistentDeduplicationStore, private readonly clock: Clock,
    private readonly windowMs: number) {}
  reserve(request: KPITriggerRequest): Promise<boolean> { const started = this.clock.now()
    return this.store.reserve({ triggerHash: `${request.triggerId}:${request.reason}`,
      companyId: request.companyId, providerKey: request.providerKey, reason: request.reason,
      windowStartedAt: started, windowExpiresAt: addMilliseconds(started, this.windowMs) }) }
}
export class PersistentOperationalRateLimiter {
  constructor(private readonly store: RateLimitStore, private readonly clock: Clock,
    private readonly windowMs: number, private readonly limit: number) {}
  consume(companyId: string, providerKey?: string): Promise<boolean> { const started = this.clock.now()
    return this.store.consume({ companyId, providerKey, windowStartedAt: started,
      windowExpiresAt: addMilliseconds(started, this.windowMs), limit: this.limit }) }
}
function addMilliseconds(value: Date, milliseconds: number): Date {
  const result = structuredClone(value); result.setTime(value.getTime() + milliseconds); return result
}

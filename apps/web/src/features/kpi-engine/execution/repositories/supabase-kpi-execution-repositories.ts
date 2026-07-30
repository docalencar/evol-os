import { z } from "zod"

import type { JsonObject, JsonValue } from "../../types/json-types"
import type { KPIExecution, KPIExecutionAttempt } from "../domain"
import type { DurableKPIExecutionStore, KPIExecutionAttemptRepository, KPIExecutionPage, KPIExecutionQuery, KPIExecutionRepository } from "./kpi-execution-repository"

type Result = Readonly<{ data: unknown; error: Readonly<{ message: string }> | null }>
export interface KPIExecutionDatabaseQuery extends PromiseLike<Result> {
  eq(column: string, value: string | number): KPIExecutionDatabaseQuery
  gte(column: string, value: string): KPIExecutionDatabaseQuery
  lte(column: string, value: string): KPIExecutionDatabaseQuery
  order(column: string, options: Readonly<{ ascending: boolean }>): KPIExecutionDatabaseQuery
  range(from: number, to: number): KPIExecutionDatabaseQuery
  maybeSingle(): PromiseLike<Result>
}
export interface KPIExecutionDatabase {
  rpc(name: string, parameters: Readonly<Record<string, unknown>>): PromiseLike<Result>
  from(table: string): Readonly<{
    select(columns: string): KPIExecutionDatabaseQuery
    upsert(value: Readonly<Record<string, unknown>>): PromiseLike<Result>
  }>
}

const jsonValue: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValue), z.record(z.string(), jsonValue),
]))
const jsonObject: z.ZodType<JsonObject> = z.record(z.string(), jsonValue)
const executionSchema = z.object({
  id: z.string(), company_id: z.string(), provider_key: z.string(), idempotency_key: z.string(),
  correlation_id: z.string(), execution_type: z.enum(["single", "batch"]),
  status: z.enum(["pending", "running", "succeeded", "partially_succeeded", "failed", "interrupted"]),
  requested_at: z.coerce.date(), started_at: z.coerce.date().nullable(), completed_at: z.coerce.date().nullable(),
  failed_at: z.coerce.date().nullable(), interrupted_at: z.coerce.date().nullable(), request_snapshot: jsonObject,
  result_snapshot: jsonObject.nullable(), error_snapshot: jsonObject.nullable(), attempt_count: z.number().int(),
  created_at: z.coerce.date(), updated_at: z.coerce.date(),
})
const attemptSchema = z.object({ id: z.string(), execution_id: z.string(), attempt_number: z.number().int(),
  status: z.enum(["running", "succeeded", "failed", "interrupted"]), started_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(), failed_at: z.coerce.date().nullable(),
  error_snapshot: jsonObject.nullable(), created_at: z.coerce.date() })

export class SupabaseKPIExecutionRepository implements KPIExecutionRepository, DurableKPIExecutionStore {
  constructor(private readonly database: KPIExecutionDatabase) {}
  async reserve(execution: KPIExecution) {
    const { data, error } = await this.database.rpc("reserve_kpi_execution", { p_execution: executionRecord(execution, true) })
    if (error) throw new Error(error.message)
    if (!Array.isArray(data) || data.length === 0) throw new Error("KPI_EXECUTION_RESERVATION_INVALID")
    const row = z.object({ reserved: z.boolean(), execution_id: z.string() }).parse(data[0])
    const stored = row.reserved ? execution : await this.findById(execution.companyId, row.execution_id)
    if (!stored) throw new Error("KPI_EXECUTION_RESERVATION_NOT_FOUND")
    return Object.freeze({ reserved: row.reserved, execution: stored })
  }
  async save(execution: KPIExecution): Promise<void> {
    const { error } = await this.database.from("kpi_executions").upsert(executionRecord(execution, false))
    if (error) throw new Error(error.message)
  }
  async findById(companyId: string, id: string) { return this.one(this.base(companyId).eq("id", id)) }
  async findByIdempotencyKey(companyId: string, providerKey: string, key: string) {
    return this.one(this.base(companyId).eq("provider_key", providerKey).eq("idempotency_key", key))
  }
  async list(input: KPIExecutionQuery) {
    let query = this.base(input.companyId)
    if (input.providerKey) query = query.eq("provider_key", input.providerKey)
    if (input.status) query = query.eq("status", input.status)
    if (input.correlationId) query = query.eq("correlation_id", input.correlationId)
    if (input.createdFrom) query = query.gte("created_at", input.createdFrom.toISOString())
    if (input.createdUntil) query = query.lte("created_at", input.createdUntil.toISOString())
    const { data, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: true })
      .range(input.page.offset, input.page.offset + Math.max(0, input.page.limit - 1))
    if (error) throw new Error(error.message)
    if (!Array.isArray(data)) throw new Error("KPI_EXECUTION_DATA_INVALID")
    return Object.freeze(data.map(mapExecution))
  }
  async startAttempt(execution: KPIExecution, attempt: KPIExecutionAttempt): Promise<void> {
    await this.call("start_kpi_execution_attempt", { p_company_id: execution.companyId,
      p_execution_id: execution.id, p_attempt_id: attempt.id, p_started_at: attempt.startedAt.toISOString() })
  }
  async completeAttempt(execution: KPIExecution, attempt: KPIExecutionAttempt): Promise<void> {
    await this.call("complete_kpi_execution", { p_company_id: execution.companyId,
      p_execution_id: execution.id, p_attempt_id: attempt.id, p_status: execution.status,
      p_result: execution.resultSnapshot, p_completed_at: execution.completedAt?.toISOString() })
  }
  async failAttempt(execution: KPIExecution, attempt: KPIExecutionAttempt): Promise<void> {
    await this.call("fail_kpi_execution", { p_company_id: execution.companyId,
      p_execution_id: execution.id, p_attempt_id: attempt.id, p_error: execution.errorSnapshot,
      p_failed_at: execution.failedAt?.toISOString() })
  }
  async interruptAttempt(execution: KPIExecution, attempt: KPIExecutionAttempt): Promise<void> {
    await this.call("interrupt_kpi_execution", { p_company_id: execution.companyId,
      p_execution_id: execution.id, p_attempt_id: attempt.id,
      p_interrupted_at: execution.interruptedAt?.toISOString() })
  }
  private base(companyId: string) { return this.database.from("kpi_executions").select("*").eq("company_id", companyId) }
  private async one(query: KPIExecutionDatabaseQuery) {
    const { data, error } = await query.maybeSingle(); if (error) throw new Error(error.message)
    return data ? mapExecution(data) : null
  }
  private async call(name: string, parameters: Readonly<Record<string, unknown>>): Promise<void> {
    const { error } = await this.database.rpc(name, parameters); if (error) throw new Error(error.message)
  }
}

export class SupabaseKPIExecutionAttemptRepository implements KPIExecutionAttemptRepository {
  constructor(private readonly database: KPIExecutionDatabase, private readonly companyId: string) {}
  async save(attempt: KPIExecutionAttempt): Promise<void> {
    const { error } = await this.database.from("kpi_execution_attempts").upsert({
      id: attempt.id, execution_id: attempt.executionId, company_id: this.companyId,
      attempt_number: attempt.attemptNumber, status: attempt.status, started_at: attempt.startedAt.toISOString(),
      completed_at: attempt.completedAt?.toISOString() ?? null, failed_at: attempt.failedAt?.toISOString() ?? null,
      error_snapshot: attempt.errorSnapshot, created_at: attempt.createdAt.toISOString(),
    }); if (error) throw new Error(error.message)
  }
  async listByExecution(executionId: string, page: KPIExecutionPage) {
    const { data, error } = await this.database.from("kpi_execution_attempts").select("*")
      .eq("company_id", this.companyId).eq("execution_id", executionId)
      .order("attempt_number", { ascending: true }).range(page.offset, page.offset + Math.max(0, page.limit - 1))
    if (error) throw new Error(error.message)
    if (!Array.isArray(data)) throw new Error("KPI_EXECUTION_ATTEMPT_DATA_INVALID")
    return Object.freeze(data.map(mapAttempt))
  }
}

function executionRecord(item: KPIExecution, camel: boolean): Readonly<Record<string, unknown>> {
  if (camel) return { id: item.id, companyId: item.companyId, providerKey: item.providerKey,
    idempotencyKey: item.idempotencyKey, correlationId: item.correlationId, executionType: item.executionType,
    requestedAt: item.requestedAt.toISOString(), requestSnapshot: item.requestSnapshot,
    createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }
  return { id: item.id, company_id: item.companyId, provider_key: item.providerKey,
    idempotency_key: item.idempotencyKey, correlation_id: item.correlationId, execution_type: item.executionType,
    status: item.status, requested_at: item.requestedAt.toISOString(), started_at: item.startedAt?.toISOString() ?? null,
    completed_at: item.completedAt?.toISOString() ?? null, failed_at: item.failedAt?.toISOString() ?? null,
    interrupted_at: item.interruptedAt?.toISOString() ?? null, request_snapshot: item.requestSnapshot,
    result_snapshot: item.resultSnapshot, error_snapshot: item.errorSnapshot, attempt_count: item.attemptCount,
    created_at: item.createdAt.toISOString(), updated_at: item.updatedAt.toISOString() }
}
function mapExecution(value: unknown): KPIExecution {
  const row = executionSchema.parse(value)
  return Object.freeze({ id: row.id, companyId: row.company_id, providerKey: row.provider_key,
    idempotencyKey: row.idempotency_key, correlationId: row.correlation_id, executionType: row.execution_type,
    status: row.status, requestedAt: row.requested_at, startedAt: row.started_at, completedAt: row.completed_at,
    failedAt: row.failed_at, interruptedAt: row.interrupted_at, requestSnapshot: row.request_snapshot,
    resultSnapshot: row.result_snapshot, errorSnapshot: row.error_snapshot, attemptCount: row.attempt_count,
    createdAt: row.created_at, updatedAt: row.updated_at })
}
function mapAttempt(value: unknown): KPIExecutionAttempt {
  const row = attemptSchema.parse(value)
  return Object.freeze({ id: row.id, executionId: row.execution_id, attemptNumber: row.attempt_number,
    status: row.status, startedAt: row.started_at, completedAt: row.completed_at, failedAt: row.failed_at,
    errorSnapshot: row.error_snapshot, createdAt: row.created_at })
}

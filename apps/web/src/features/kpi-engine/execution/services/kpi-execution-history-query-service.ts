import type { JsonObject } from "../../types/json-types"
import type { KPIExecution, KPIExecutionAttempt, KPIExecutionStatus } from "../domain"
import type { KPIExecutionAttemptRepository, KPIExecutionPage, KPIExecutionQuery, KPIExecutionRepository } from "../repositories"

export type KPIExecutionHistoryDTO = Readonly<{
  id: string; companyId: string; providerKey: string; idempotencyKey: string; correlationId: string
  executionType: "single" | "batch"; status: KPIExecutionStatus; requestedAt: string
  startedAt: string | null; completedAt: string | null; failedAt: string | null
  interruptedAt: string | null; requestSnapshot: JsonObject; resultSnapshot: JsonObject | null
  errorSnapshot: JsonObject | null; attemptCount: number; createdAt: string; updatedAt: string
}>

export type KPIExecutionAttemptDTO = Readonly<{
  id: string; executionId: string; attemptNumber: number; status: KPIExecutionAttempt["status"]
  startedAt: string; completedAt: string | null; failedAt: string | null
  errorSnapshot: JsonObject | null; createdAt: string
}>

export class KPIExecutionHistoryQueryService {
  constructor(private readonly executions: KPIExecutionRepository,
    private readonly attempts: KPIExecutionAttemptRepository) {}
  async getById(companyId: string, id: string) { return mapOptional(await this.executions.findById(companyId, id)) }
  async getByIdempotencyKey(companyId: string, providerKey: string, key: string) {
    return mapOptional(await this.executions.findByIdempotencyKey(companyId, providerKey, key))
  }
  async list(query: KPIExecutionQuery) { return Object.freeze((await this.executions.list(query)).map(toHistoryDTO)) }
  listByCompany(companyId: string, page: KPIExecutionPage) { return this.list({ companyId, page }) }
  listByProvider(companyId: string, providerKey: string, page: KPIExecutionPage) { return this.list({ companyId, providerKey, page }) }
  listByStatus(companyId: string, status: KPIExecutionStatus, page: KPIExecutionPage) { return this.list({ companyId, status, page }) }
  listByPeriod(companyId: string, createdFrom: Date, createdUntil: Date, page: KPIExecutionPage) { return this.list({ companyId, createdFrom, createdUntil, page }) }
  listByCorrelationId(companyId: string, correlationId: string, page: KPIExecutionPage) { return this.list({ companyId, correlationId, page }) }
  listLatest(companyId: string, page: KPIExecutionPage) { return this.listByCompany(companyId, page) }
  listFailed(companyId: string, page: KPIExecutionPage) { return this.listByStatus(companyId, "failed", page) }
  listRunning(companyId: string, page: KPIExecutionPage) { return this.listByStatus(companyId, "running", page) }
  async listAttempts(executionId: string, page: KPIExecutionPage) {
    return Object.freeze((await this.attempts.listByExecution(executionId, page)).map(toAttemptDTO))
  }
}

export function toHistoryDTO(item: KPIExecution): KPIExecutionHistoryDTO {
  return Object.freeze({ ...item, requestedAt: item.requestedAt.toISOString(),
    startedAt: iso(item.startedAt), completedAt: iso(item.completedAt), failedAt: iso(item.failedAt),
    interruptedAt: iso(item.interruptedAt), createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() })
}

function toAttemptDTO(item: KPIExecutionAttempt): KPIExecutionAttemptDTO {
  return Object.freeze({ ...item, startedAt: item.startedAt.toISOString(), completedAt: iso(item.completedAt),
    failedAt: iso(item.failedAt), createdAt: item.createdAt.toISOString() })
}
function mapOptional(item: KPIExecution | null) { return item ? toHistoryDTO(item) : null }
function iso(value: Date | null): string | null { return value?.toISOString() ?? null }

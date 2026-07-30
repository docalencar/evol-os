import type { Clock, IdGenerator, JsonObject } from "../.."
import type {
  KPIBatchExecutionRequest, KPIBatchExecutionResult, KPIExecutionContext,
  KPIExecutionPolicy, KPIExecutionRequest, KPIExecutionResult,
} from "../contracts"
import {
  completeKPIExecution, createKPIExecution, createKPIExecutionAttempt,
  failKPIExecution, interruptKPIExecution, startKPIExecution,
  type KPIExecution, type KPIExecutionAttempt,
} from "../domain"
import type { DurableKPIExecutionStore, KPIExecutionAttemptRepository, KPIExecutionRepository } from "../repositories"

export class DurableKPIExecutionPolicy implements KPIExecutionPolicy {
  private readonly active = new Map<string, Readonly<{ execution: KPIExecution; attempt: KPIExecutionAttempt }>>()

  constructor(private readonly executions: KPIExecutionRepository,
    private readonly attempts: KPIExecutionAttemptRepository,
    private readonly clock: Clock, private readonly ids: IdGenerator,
    private readonly store?: DurableKPIExecutionStore) {}

  async begin(key: string, allowReexecution: boolean,
    request?: KPIExecutionRequest | KPIBatchExecutionRequest,
    context?: KPIExecutionContext) {
    if (!request || !context) throw new Error("KPI_DURABLE_EXECUTION_CONTEXT_REQUIRED")
    const companyId = company(request)
    const providerKey = "requests" in request ? "batch" : request.providerKey
    const existing = await this.executions.findByIdempotencyKey(companyId, providerKey, key)
    if (existing && !allowReexecution) return Object.freeze({ allowed: false, reason: existing.status === "running" ? "in-progress" as const : "duplicate" as const })
    if (existing?.status === "interrupted") return Object.freeze({ allowed: false, reason: "interrupted" as const })
    const at = this.clock.now()
    let execution = existing ?? createKPIExecution({ id: context.executionId, companyId, providerKey,
      idempotencyKey: key, correlationId: context.correlationId ?? this.ids.generate(),
      executionType: "requests" in request ? "batch" : "single", requestedAt: context.requestedAt,
      requestSnapshot: requestSnapshot(request), createdAt: at })
    if (!existing) {
      const reservation = await this.executions.reserve(execution)
      if (!reservation.reserved) return Object.freeze({ allowed: false, reason: reservation.execution.status === "running" ? "in-progress" as const : "duplicate" as const })
    }
    execution = startKPIExecution(execution, at)
    const attempt = createKPIExecutionAttempt({ id: this.ids.generate(), executionId: execution.id,
      attemptNumber: execution.attemptCount, startedAt: at })
    if (this.store) await this.store.startAttempt(execution, attempt)
    else { await this.executions.save(execution); await this.attempts.save(attempt) }
    this.active.set(key, Object.freeze({ execution, attempt }))
    return Object.freeze({ allowed: true, reason: "allowed" as const,
      attemptId: attempt.id, attempt: attempt.attemptNumber })
  }

  async complete(key: string, result: KPIExecutionResult | KPIBatchExecutionResult): Promise<void> {
    const active = this.requireActive(key)
    const at = this.clock.now()
    const status = "results" in result && result.status === "partial" ? "partially_succeeded" : "succeeded"
    const execution = completeKPIExecution(active.execution, status, resultSnapshot(result), at)
    const attempt = Object.freeze({ ...active.attempt, status: "succeeded" as const, completedAt: at })
    if (this.store) await this.store.completeAttempt(execution, attempt)
    else { await this.executions.save(execution); await this.attempts.save(attempt) }
    this.active.delete(key)
  }

  async fail(key: string, result?: KPIExecutionResult | KPIBatchExecutionResult): Promise<void> {
    const active = this.requireActive(key)
    const at = this.clock.now()
    const snapshot = Object.freeze({ message: result && "error" in result
      ? result.error ?? "KPI_EXECUTION_FAILED" : "KPI_BATCH_EXECUTION_FAILED" })
    const execution = failKPIExecution(active.execution, snapshot, at)
    const attempt = Object.freeze({ ...active.attempt, status: "failed" as const, failedAt: at, errorSnapshot: snapshot })
    if (this.store) await this.store.failAttempt(execution, attempt)
    else { await this.executions.save(execution); await this.attempts.save(attempt) }
    this.active.delete(key)
  }

  async interrupt(key: string): Promise<void> {
    const active = this.active.get(key)
    if (!active) return
    const at = this.clock.now()
    const execution = interruptKPIExecution(active.execution, at)
    const attempt = Object.freeze({ ...active.attempt, status: "interrupted" as const })
    if (this.store) await this.store.interruptAttempt(execution, attempt)
    else { await this.executions.save(execution); await this.attempts.save(attempt) }
    this.active.delete(key)
  }

  private requireActive(key: string) {
    const active = this.active.get(key)
    if (!active) throw new Error("KPI_DURABLE_EXECUTION_NOT_ACTIVE")
    return active
  }
}

function company(request: KPIExecutionRequest | KPIBatchExecutionRequest): string {
  return "requests" in request ? request.requests[0]?.evaluation.context.companyId ?? "" : request.evaluation.context.companyId
}

function requestSnapshot(request: KPIExecutionRequest | KPIBatchExecutionRequest): JsonObject {
  if ("requests" in request) return Object.freeze({ idempotencyKey: request.idempotencyKey,
    stopOnFailure: request.stopOnFailure ?? false, kpiCount: request.requests.length,
    providerKeys: Object.freeze(request.requests.map((item) => item.providerKey)) })
  return Object.freeze({ providerKey: request.providerKey, idempotencyKey: request.idempotencyKey,
    definitionKey: request.evaluation.context.definitionKey,
    companyId: request.evaluation.context.companyId })
}

function resultSnapshot(result: KPIExecutionResult | KPIBatchExecutionResult): JsonObject {
  if ("results" in result) return Object.freeze({ status: result.status, succeeded: result.succeeded,
    failed: result.failed, persisted: result.persisted,
    evaluationIds: Object.freeze(result.results.flatMap((item) => item.evaluation ? [item.evaluation.id] : [])) })
  return Object.freeze({ status: result.status, evaluationId: result.evaluation?.id ?? null })
}

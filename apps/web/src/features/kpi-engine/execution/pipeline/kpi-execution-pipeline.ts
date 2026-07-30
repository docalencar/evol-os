import type { Clock, IdGenerator } from "../.."
import type {
  KPIBatchExecutionRequest, KPIBatchExecutionResult, KPIExecutionExecutor,
  KPIExecutionContext, KPIExecutionPolicy, KPIExecutionRequest, KPIExecutionResult, KPIExecutionTelemetry,
  KPIExecutionTelemetryEvent,
} from "../contracts"
import { BatchExecutionExecutor } from "../executors"
import { KPIExecutionRequestValidator } from "./kpi-execution-request-validator"

export class KPIExecutionPipeline {
  constructor(
    private readonly executors: readonly KPIExecutionExecutor[],
    private readonly policy: KPIExecutionPolicy,
    private readonly telemetry: KPIExecutionTelemetry,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly validator = new KPIExecutionRequestValidator()
  ) {}

  async execute(request: KPIExecutionRequest): Promise<KPIExecutionResult> {
    this.validator.validate(request)
    let context = this.context(request.idempotencyKey, request.evaluation.context.companyId,
      request.providerKey, request.correlationId)
    const decision = await this.policy.begin(request.idempotencyKey, request.allowReexecution ?? false, request, context)
    if (!decision.allowed) {
      const at = this.clock.now()
      await this.emit(context,
        decision.reason === "interrupted" ? "interrupted" : "duplicate",
        at, at, 1, 0, 0, 0)
      return this.deniedSingle(context, decision.reason)
    }
    context = Object.freeze({ ...context, attemptId: decision.attemptId,
      attempt: decision.attempt ?? context.attempt })
    const startedAt = this.clock.now()
    await this.emit(context, "started", startedAt, startedAt, 1, 0, 0, 0)
    const executor = this.resolve(request.providerKey)
    const result = executor
      ? await executor.execute(request, context)
      : Object.freeze({ context, status: "failed" as const, evaluation: null,
        error: `KPI_EXECUTOR_NOT_FOUND:${request.providerKey}` })
    if (result.status === "succeeded") await this.policy.complete(request.idempotencyKey, result)
    else await this.policy.fail(request.idempotencyKey, result)
    const finishedAt = this.clock.now()
    await this.emit(context, result.status === "succeeded" ? "completed" : "failed",
      startedAt, finishedAt, 1, result.status === "succeeded" ? 1 : 0,
      result.status === "failed" ? 1 : 0, result.status === "succeeded" ? 1 : 0)
    return result
  }

  async executeBatch(request: KPIBatchExecutionRequest): Promise<KPIBatchExecutionResult> {
    this.validator.validateBatch(request)
    const first = request.requests[0]!
    let context = this.context(request.idempotencyKey, first.evaluation.context.companyId,
      "batch", request.correlationId)
    const decision = await this.policy.begin(request.idempotencyKey, request.allowReexecution ?? false, request, context)
    if (!decision.allowed) {
      const at = this.clock.now()
      await this.emit(context,
        decision.reason === "interrupted" ? "interrupted" : "duplicate",
        at, at, request.requests.length, 0, 0, 0)
      return this.deniedBatch(context, decision.reason)
    }
    context = Object.freeze({ ...context, attemptId: decision.attemptId,
      attempt: decision.attempt ?? context.attempt })
    const startedAt = this.clock.now()
    await this.emit(context, "started", startedAt, startedAt, request.requests.length, 0, 0, 0)
    const result = await new BatchExecutionExecutor((key) => this.resolve(key)).execute(request, context)
    if (result.status === "failed") await this.policy.fail(request.idempotencyKey, result)
    else await this.policy.complete(request.idempotencyKey, result)
    const finishedAt = this.clock.now()
    await this.emit(context, result.status === "failed" ? "failed" : "completed",
      startedAt, finishedAt, request.requests.length, result.succeeded, result.failed, result.persisted)
    return result
  }

  async interrupt(idempotencyKey: string): Promise<void> { await this.policy.interrupt(idempotencyKey) }

  private resolve(key: string): KPIExecutionExecutor | null {
    return this.executors.find((item) => item.key === key) ?? null
  }

  private context(idempotencyKey: string, companyId: string, providerKey: string,
    correlationId?: string): KPIExecutionContext {
    return Object.freeze({ executionId: this.ids.generate(), requestedAt: this.clock.now(), idempotencyKey,
      attempt: 1, companyId, providerKey, correlationId: correlationId ?? this.ids.generate() })
  }

  private deniedSingle(context: ReturnType<KPIExecutionPipeline["context"]>, reason: "duplicate" | "in-progress" | "interrupted") {
    const status = reason === "interrupted" ? "interrupted" as const : "duplicate" as const
    return Object.freeze({ context, status, evaluation: null, error: `KPI_EXECUTION_${reason.toUpperCase()}` })
  }

  private deniedBatch(context: ReturnType<KPIExecutionPipeline["context"]>, reason: "duplicate" | "in-progress" | "interrupted"): KPIBatchExecutionResult {
    return Object.freeze({ context, status: reason === "interrupted" ? "interrupted" : "duplicate",
      results: Object.freeze([]), succeeded: 0, failed: 0, persisted: 0 })
  }

  private async emit(context: KPIExecutionContext, kind: KPIExecutionTelemetryEvent["kind"], startedAt: Date,
    finishedAt: Date, kpiCount: number, succeeded: number, failed: number, persisted: number): Promise<void> {
    await this.telemetry.record(Object.freeze({ executionId: context.executionId,
      attemptId: context.attemptId, companyId: context.companyId, providerKey: context.providerKey,
      correlationId: context.correlationId, idempotencyKey: context.idempotencyKey, kind,
      status: kind, startedAt, finishedAt,
      durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      kpiCount, succeeded, failed, persisted }))
  }
}

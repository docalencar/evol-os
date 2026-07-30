import type { Clock, IdGenerator } from "../.."
import type {
  KPIBatchExecutionRequest, KPIBatchExecutionResult, KPIExecutionExecutor,
  KPIExecutionPolicy, KPIExecutionRequest, KPIExecutionResult, KPIExecutionTelemetry,
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
    const context = this.context(request.idempotencyKey)
    const decision = this.policy.begin(request.idempotencyKey, request.allowReexecution ?? false)
    if (!decision.allowed) {
      const at = this.clock.now()
      await this.emit(context.executionId,
        decision.reason === "interrupted" ? "interrupted" : "duplicate",
        at, at, 1, 0, 0, 0)
      return this.deniedSingle(context, decision.reason)
    }
    const startedAt = this.clock.now()
    await this.emit(context.executionId, "started", startedAt, startedAt, 1, 0, 0, 0)
    const executor = this.resolve(request.providerKey)
    const result = executor
      ? await executor.execute(request, context)
      : Object.freeze({ context, status: "failed" as const, evaluation: null,
        error: `KPI_EXECUTOR_NOT_FOUND:${request.providerKey}` })
    if (result.status === "succeeded") this.policy.complete(request.idempotencyKey, result)
    else this.policy.fail(request.idempotencyKey)
    const finishedAt = this.clock.now()
    await this.emit(context.executionId, result.status === "succeeded" ? "completed" : "failed",
      startedAt, finishedAt, 1, result.status === "succeeded" ? 1 : 0,
      result.status === "failed" ? 1 : 0, result.status === "succeeded" ? 1 : 0)
    return result
  }

  async executeBatch(request: KPIBatchExecutionRequest): Promise<KPIBatchExecutionResult> {
    this.validator.validateBatch(request)
    const context = this.context(request.idempotencyKey)
    const decision = this.policy.begin(request.idempotencyKey, request.allowReexecution ?? false)
    if (!decision.allowed) {
      const at = this.clock.now()
      await this.emit(context.executionId,
        decision.reason === "interrupted" ? "interrupted" : "duplicate",
        at, at, request.requests.length, 0, 0, 0)
      return this.deniedBatch(context, decision.reason)
    }
    const startedAt = this.clock.now()
    await this.emit(context.executionId, "started", startedAt, startedAt, request.requests.length, 0, 0, 0)
    const result = await new BatchExecutionExecutor((key) => this.resolve(key)).execute(request, context)
    this.policy.complete(request.idempotencyKey, result)
    const finishedAt = this.clock.now()
    await this.emit(context.executionId, result.status === "failed" ? "failed" : "completed",
      startedAt, finishedAt, request.requests.length, result.succeeded, result.failed, result.persisted)
    return result
  }

  interrupt(idempotencyKey: string): void { this.policy.interrupt(idempotencyKey) }

  private resolve(key: string): KPIExecutionExecutor | null {
    return this.executors.find((item) => item.key === key) ?? null
  }

  private context(idempotencyKey: string) {
    return Object.freeze({ executionId: this.ids.generate(), requestedAt: this.clock.now(), idempotencyKey, attempt: 1 })
  }

  private deniedSingle(context: ReturnType<KPIExecutionPipeline["context"]>, reason: "duplicate" | "in-progress" | "interrupted") {
    const status = reason === "interrupted" ? "interrupted" as const : "duplicate" as const
    return Object.freeze({ context, status, evaluation: null, error: `KPI_EXECUTION_${reason.toUpperCase()}` })
  }

  private deniedBatch(context: ReturnType<KPIExecutionPipeline["context"]>, reason: "duplicate" | "in-progress" | "interrupted"): KPIBatchExecutionResult {
    return Object.freeze({ context, status: reason === "interrupted" ? "interrupted" : "duplicate",
      results: Object.freeze([]), succeeded: 0, failed: 0, persisted: 0 })
  }

  private async emit(executionId: string, kind: KPIExecutionTelemetryEvent["kind"], startedAt: Date,
    finishedAt: Date, kpiCount: number, succeeded: number, failed: number, persisted: number): Promise<void> {
    await this.telemetry.record(Object.freeze({ executionId, kind, startedAt, finishedAt,
      durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      kpiCount, succeeded, failed, persisted }))
  }
}

import type { Clock } from "../.."
import type {
  KPIBatchExecutionRequest, KPIBatchExecutionResult, KPIExecutionRequest,
  KPIExecutionResult, KPIExecutionTelemetry,
} from "../contracts"
import type { KPIExecutionPlatform } from "../services"

export type DispatchRequest = KPIExecutionRequest | KPIBatchExecutionRequest
export type DispatchResult = KPIExecutionResult | KPIBatchExecutionResult

export class ExecutionDispatcher {
  constructor(private readonly platform: KPIExecutionPlatform,
    private readonly telemetry: KPIExecutionTelemetry, private readonly clock: Clock) {}

  async dispatch(request: DispatchRequest): Promise<DispatchResult> {
    const startedAt = this.clock.now()
    const companyId = "requests" in request
      ? request.requests[0]?.evaluation.context.companyId ?? ""
      : request.evaluation.context.companyId
    const providerKey = "requests" in request ? "batch" : request.providerKey
    await this.emit("dispatcher_started", request.idempotencyKey, companyId, providerKey,
      request.correlationId, startedAt, startedAt, 0, 0, 0)
    const result = "requests" in request
      ? await this.platform.executeBatch({ ...request, allowReexecution: true })
      : await this.platform.execute({ ...request, allowReexecution: true })
    const finishedAt = this.clock.now()
    const counts = "results" in result
      ? { succeeded: result.succeeded, failed: result.failed, persisted: result.persisted }
      : { succeeded: result.status === "succeeded" ? 1 : 0,
        failed: result.status === "failed" ? 1 : 0,
        persisted: result.status === "succeeded" ? 1 : 0 }
    await this.emit("dispatcher_completed", request.idempotencyKey, companyId, providerKey,
      result.context.correlationId, startedAt, finishedAt,
      counts.succeeded, counts.failed, counts.persisted)
    return result
  }

  private async emit(kind: "dispatcher_started" | "dispatcher_completed", idempotencyKey: string,
    companyId: string, providerKey: string, correlationId: string | undefined,
    startedAt: Date, finishedAt: Date, succeeded: number, failed: number, persisted: number) {
    await this.telemetry.record(Object.freeze({ executionId: idempotencyKey, companyId, providerKey,
      correlationId, idempotencyKey, status: kind, kind, startedAt, finishedAt,
      durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      kpiCount: succeeded + failed, succeeded, failed, persisted }))
  }
}

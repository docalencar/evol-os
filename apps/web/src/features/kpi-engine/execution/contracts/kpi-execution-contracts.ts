import type { EvaluateKPIInput, KPIEvaluationDTO } from "../.."

export type KPIExecutionContext = Readonly<{
  executionId: string
  attemptId?: string
  companyId?: string
  providerKey?: string
  correlationId?: string
  requestedAt: Date
  idempotencyKey: string
  attempt: number
}>

export type KPIExecutionRequest = Readonly<{
  providerKey: string
  idempotencyKey: string
  evaluation: EvaluateKPIInput
  correlationId?: string
  allowReexecution?: boolean
}>

export type KPIExecutionResult = Readonly<{
  context: KPIExecutionContext
  status: "succeeded" | "failed" | "duplicate" | "interrupted"
  evaluation: KPIEvaluationDTO | null
  error: string | null
}>

export type KPIBatchExecutionRequest = Readonly<{
  idempotencyKey: string
  requests: readonly KPIExecutionRequest[]
  correlationId?: string
  stopOnFailure?: boolean
  allowReexecution?: boolean
}>

export type KPIBatchExecutionResult = Readonly<{
  context: KPIExecutionContext
  status: "succeeded" | "partial" | "failed" | "duplicate" | "interrupted"
  results: readonly KPIExecutionResult[]
  succeeded: number
  failed: number
  persisted: number
}>

export interface KPIExecutionExecutor {
  readonly key: string
  execute(request: KPIExecutionRequest, context: KPIExecutionContext): Promise<KPIExecutionResult>
}

export type KPIExecutionPolicyDecision =
  | Readonly<{ allowed: true; reason: "allowed"; attemptId?: string; attempt?: number }>
  | Readonly<{
    allowed: false
    reason: "duplicate" | "in-progress" | "interrupted"
    previous?: KPIExecutionResult | KPIBatchExecutionResult
  }>

export interface KPIExecutionPolicy {
  begin(key: string, allowReexecution: boolean,
    request?: KPIExecutionRequest | KPIBatchExecutionRequest,
    context?: KPIExecutionContext): KPIExecutionPolicyDecision | Promise<KPIExecutionPolicyDecision>
  complete(key: string, result: KPIExecutionResult | KPIBatchExecutionResult): void | Promise<void>
  fail(key: string, result?: KPIExecutionResult | KPIBatchExecutionResult): void | Promise<void>
  interrupt(key: string): void | Promise<void>
}

export type KPIExecutionTelemetryEvent = Readonly<{
  executionId: string
  attemptId?: string
  companyId?: string
  providerKey?: string
  correlationId?: string
  idempotencyKey?: string
  status?: string
  kind: "started" | "completed" | "failed" | "duplicate" | "interrupted"
  startedAt: Date
  finishedAt: Date
  durationMs: number
  kpiCount: number
  succeeded: number
  failed: number
  persisted: number
}>

export interface KPIExecutionTelemetry {
  record(event: KPIExecutionTelemetryEvent): void | Promise<void>
}

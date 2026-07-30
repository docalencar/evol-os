import type { EvaluateKPIInput, KPIEvaluationDTO } from "../.."

export type KPIExecutionContext = Readonly<{
  executionId: string
  requestedAt: Date
  idempotencyKey: string
  attempt: number
}>

export type KPIExecutionRequest = Readonly<{
  providerKey: string
  idempotencyKey: string
  evaluation: EvaluateKPIInput
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
  | Readonly<{ allowed: true; reason: "allowed" }>
  | Readonly<{
    allowed: false
    reason: "duplicate" | "in-progress" | "interrupted"
    previous?: KPIExecutionResult | KPIBatchExecutionResult
  }>

export interface KPIExecutionPolicy {
  begin(key: string, allowReexecution: boolean): KPIExecutionPolicyDecision
  complete(key: string, result: KPIExecutionResult | KPIBatchExecutionResult): void
  fail(key: string): void
  interrupt(key: string): void
}

export type KPIExecutionTelemetryEvent = Readonly<{
  executionId: string
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

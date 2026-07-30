import type { JsonObject } from "../../types/json-types"

export type KPIExecutionAttemptStatus = "running" | "succeeded" | "failed" | "interrupted"
export type KPIExecutionAttempt = Readonly<{
  id: string
  executionId: string
  attemptNumber: number
  status: KPIExecutionAttemptStatus
  startedAt: Date
  completedAt: Date | null
  failedAt: Date | null
  errorSnapshot: JsonObject | null
  createdAt: Date
}>

export function createKPIExecutionAttempt(input: Readonly<{
  id: string; executionId: string; attemptNumber: number; startedAt: Date
}>): KPIExecutionAttempt {
  if (!Number.isInteger(input.attemptNumber) || input.attemptNumber <= 0) throw new Error("KPI_ATTEMPT_INVALID_NUMBER")
  return Object.freeze({ ...input, status: "running", completedAt: null, failedAt: null,
    errorSnapshot: null, createdAt: input.startedAt })
}

export function finishKPIExecutionAttempt(attempt: KPIExecutionAttempt,
  status: "succeeded" | "failed" | "interrupted", at: Date,
  errorSnapshot: JsonObject | null = null): KPIExecutionAttempt {
  if (attempt.status !== "running") throw new Error(`KPI_ATTEMPT_INVALID_TRANSITION:${attempt.status}`)
  return Object.freeze({ ...attempt, status, completedAt: status === "succeeded" ? at : null,
    failedAt: status === "failed" ? at : null, errorSnapshot })
}

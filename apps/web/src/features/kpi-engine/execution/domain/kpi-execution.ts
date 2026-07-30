import type { JsonObject } from "../../types/json-types"

export const KPI_EXECUTION_STATUSES = ["pending", "running", "succeeded", "partially_succeeded", "failed", "interrupted"] as const
export type KPIExecutionStatus = (typeof KPI_EXECUTION_STATUSES)[number]
export type KPIExecutionType = "single" | "batch"

export type KPIExecution = Readonly<{
  id: string
  companyId: string
  providerKey: string
  idempotencyKey: string
  correlationId: string
  executionType: KPIExecutionType
  status: KPIExecutionStatus
  requestedAt: Date
  startedAt: Date | null
  completedAt: Date | null
  failedAt: Date | null
  interruptedAt: Date | null
  requestSnapshot: JsonObject
  resultSnapshot: JsonObject | null
  errorSnapshot: JsonObject | null
  attemptCount: number
  createdAt: Date
  updatedAt: Date
}>

export type CreateKPIExecutionInput = Omit<KPIExecution,
  "status" | "startedAt" | "completedAt" | "failedAt" | "interruptedAt" |
  "resultSnapshot" | "errorSnapshot" | "attemptCount" | "createdAt" | "updatedAt"> &
  Readonly<{ createdAt: Date }>

export function createKPIExecution(input: CreateKPIExecutionInput): KPIExecution {
  requireText(input.id, "id"); requireText(input.companyId, "companyId")
  requireText(input.providerKey, "providerKey"); requireText(input.idempotencyKey, "idempotencyKey")
  requireText(input.correlationId, "correlationId")
  return freezeExecution({ ...input, status: "pending", startedAt: null, completedAt: null,
    failedAt: null, interruptedAt: null, resultSnapshot: null, errorSnapshot: null,
    attemptCount: 0, updatedAt: input.createdAt })
}

export function startKPIExecution(execution: KPIExecution, at: Date): KPIExecution {
  assertStatus(execution, ["pending", "failed"])
  return freezeExecution({ ...execution, status: "running", startedAt: at, completedAt: null,
    failedAt: null, interruptedAt: null, errorSnapshot: null,
    attemptCount: execution.attemptCount + 1, updatedAt: at })
}

export function completeKPIExecution(execution: KPIExecution, status: "succeeded" | "partially_succeeded",
  resultSnapshot: JsonObject, at: Date): KPIExecution {
  assertStatus(execution, ["running"])
  return freezeExecution({ ...execution, status, resultSnapshot, completedAt: at, updatedAt: at })
}

export function failKPIExecution(execution: KPIExecution, errorSnapshot: JsonObject, at: Date): KPIExecution {
  assertStatus(execution, ["running"])
  return freezeExecution({ ...execution, status: "failed", errorSnapshot, failedAt: at, updatedAt: at })
}

export function interruptKPIExecution(execution: KPIExecution, at: Date): KPIExecution {
  assertStatus(execution, ["pending", "running", "failed"])
  return freezeExecution({ ...execution, status: "interrupted", interruptedAt: at, updatedAt: at })
}

export function freezeExecution(execution: KPIExecution): KPIExecution {
  return Object.freeze({ ...execution })
}

function assertStatus(execution: KPIExecution, allowed: readonly KPIExecutionStatus[]): void {
  if (!allowed.includes(execution.status)) throw new Error(`KPI_EXECUTION_INVALID_TRANSITION:${execution.status}`)
}

function requireText(value: string, field: string): void {
  if (value.trim() === "") throw new Error(`KPI_EXECUTION_INVALID_${field.toUpperCase()}`)
}

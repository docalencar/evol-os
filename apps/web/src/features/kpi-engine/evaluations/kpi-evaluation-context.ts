import type { JsonObject, JsonValue } from "../types/json-types"
import { KPIEvaluationError } from "./kpi-evaluation-error"

export const KPI_EVALUATION_SCOPE_TYPES = [
  "company",
  "department",
  "team",
  "employee",
  "position",
  "workspace",
  "scenario",
  "custom",
] as const

export type KPIEvaluationScopeType =
  (typeof KPI_EVALUATION_SCOPE_TYPES)[number]

export type KPIEvaluationContextInput = Readonly<{
  companyId: string
  definitionKey: string
  definitionVersion?: number
  ownerModule: string
  scopeType: KPIEvaluationScopeType
  scopeId?: string
  periodStart: Date
  periodEnd: Date
  evaluatedAt: Date
  requestedBy?: string
  correlationId?: string
  metadata: JsonObject
}>

export type KPIEvaluationContext = Readonly<{
  companyId: string
  definitionKey: string
  definitionVersion?: number
  ownerModule: string
  scopeType: KPIEvaluationScopeType
  scopeId?: string
  periodStart: Date
  periodEnd: Date
  evaluatedAt: Date
  requestedBy?: string
  correlationId?: string
  metadata: JsonObject
}>

export function createKPIEvaluationContext(
  input: KPIEvaluationContextInput
): KPIEvaluationContext {
  if (input.companyId.trim() === "" || input.definitionKey.trim() === "" ||
      input.ownerModule.trim() === "" ||
      !Number.isFinite(input.periodStart.getTime()) ||
      !Number.isFinite(input.periodEnd.getTime()) ||
      !Number.isFinite(input.evaluatedAt.getTime())) {
    throw new KPIEvaluationError("INVALID_CONTEXT", "Contexto de avaliação inválido.")
  }
  if (input.definitionVersion !== undefined &&
      (!Number.isInteger(input.definitionVersion) || input.definitionVersion <= 0)) {
    throw new KPIEvaluationError("INVALID_CONTEXT", "A versão solicitada deve ser um inteiro positivo.")
  }
  if (input.periodEnd.getTime() < input.periodStart.getTime()) {
    throw new KPIEvaluationError("INVALID_CONTEXT", "O fim do período antecede seu início.")
  }
  if (input.scopeType !== "company" && !input.scopeId?.trim()) {
    throw new KPIEvaluationError("INVALID_CONTEXT", "O escopo informado exige scopeId.")
  }

  return Object.freeze({
    ...input,
    periodStart: new Date(input.periodStart.getTime()),
    periodEnd: new Date(input.periodEnd.getTime()),
    evaluatedAt: new Date(input.evaluatedAt.getTime()),
    metadata: copyJsonObject(input.metadata),
  })
}

export function copyKPIEvaluationContext(
  context: KPIEvaluationContext
): KPIEvaluationContext {
  return createKPIEvaluationContext(context)
}

export function copyJsonObject(value: unknown): JsonObject {
  const copied = copyJsonValue(value, new WeakSet<object>())
  if (copied === null || isJsonArray(copied) || typeof copied !== "object") {
    throw new KPIEvaluationError("INVALID_METADATA", "Metadata deve ser um objeto JSON.")
  }
  return copied
}

function isJsonArray(value: JsonValue): value is readonly JsonValue[] {
  return Array.isArray(value)
}

function copyJsonValue(value: unknown, seen: WeakSet<object>): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new KPIEvaluationError("INVALID_METADATA", "Metadata contém número não finito.")
    }
    return value
  }
  if (typeof value !== "object") {
    throw new KPIEvaluationError("INVALID_METADATA", "Metadata contém valor não serializável.")
  }
  if (seen.has(value)) {
    throw new KPIEvaluationError("INVALID_METADATA", "Metadata contém referência cíclica.")
  }
  seen.add(value)

  if (Array.isArray(value)) {
    const result = Object.freeze(value.map((item) => copyJsonValue(item, seen)))
    seen.delete(value)
    return result
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new KPIEvaluationError("INVALID_METADATA", "Metadata contém estrutura não JSON.")
  }
  const result: Record<string, JsonValue> = {}
  for (const [key, item] of Object.entries(value)) {
    result[key] = copyJsonValue(item, seen)
  }
  seen.delete(value)
  return Object.freeze(result)
}

import type { KPIDefinition } from "../contracts/kpi-definition"
import type { KPIDefinitionVersion } from "../registry"

export type KPIDefinitionCalculatorResolver = Readonly<{
  resolve(input: Readonly<{
    definitionId: string
    key: string
    version: number
  }>): KPIDefinition<unknown>["calculate"]
}>

export function toPersistedKPIDefinition(
  definition: KPIDefinitionVersion
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    name: definition.definition.name,
    description: definition.definition.description,
    ownerModule: definition.definition.ownerModule ?? "",
    category: definition.definition.category ?? null,
    valueKind: definition.definition.valueKind,
    unit: definition.definition.unit ?? null,
    precision: definition.definition.precision ?? null,
    favorableDirection: definition.definition.favorableDirection,
    thresholds: definition.definition.thresholds ?? [],
    target: definition.definition.target ?? null,
    features: definition.definition.features ?? {
      trend: false,
      benchmark: false,
      forecast: false,
      sla: false,
    },
  })
}

export function mapPersistedKPIDefinition(
  value: unknown,
  calculatorResolver: KPIDefinitionCalculatorResolver
): KPIDefinitionVersion {
  if (!isRecord(value)) throw invalidDefinition()
  const definitionId = requireString(value.definition_id)
  const key = requireString(value.definition_key)
  const version = requirePositiveInteger(value.version)
  const effectiveFrom = requireDate(value.effective_from)
  const effectiveUntil = value.effective_until == null
    ? null
    : requireDate(value.effective_until)
  const valueKind = requireEnum(value.value_kind, [
    "number", "percentage", "currency", "duration", "ratio",
  ] as const)
  const favorableDirection = requireEnum(value.favorable_direction, [
    "increase", "decrease", "neutral",
  ] as const)

  return Object.freeze({
    definitionId,
    key,
    version,
    effectiveFrom,
    effectiveUntil,
    active: requireBoolean(value.active),
    definition: Object.freeze({
      id: definitionId,
      key,
      name: requireString(value.name),
      description: requireString(value.description, true),
      ownerModule: requireString(value.owner_module),
      category: optionalDefinitionString(value.category),
      valueKind,
      unit: optionalDefinitionString(value.unit),
      precision: optionalNonNegativeInteger(value.precision),
      favorableDirection,
      thresholds: parseThresholds(value.thresholds),
      target: optionalFiniteNumber(value.target),
      features: parseFeatures(value.features),
      calculate: calculatorResolver.resolve({ definitionId, key, version }),
    }),
  })
}

function parseThresholds(value: unknown): NonNullable<KPIDefinition<unknown>["thresholds"]> {
  if (!Array.isArray(value)) throw invalidDefinition()
  return Object.freeze(value.map((item) => {
    if (!isRecord(item)) throw invalidDefinition()
    return Object.freeze({
      level: requireEnum(item.level, ["info", "warning", "critical"] as const),
      operator: requireEnum(item.operator, ["at-least", "at-most"] as const),
      value: requireFiniteNumber(item.value),
    })
  }))
}

function parseFeatures(value: unknown): NonNullable<KPIDefinition<unknown>["features"]> {
  if (!isRecord(value)) throw invalidDefinition()
  return Object.freeze({
    trend: requireBoolean(value.trend),
    benchmark: requireBoolean(value.benchmark),
    forecast: requireBoolean(value.forecast),
    sla: requireBoolean(value.sla),
  })
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function requireString(value: unknown, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    throw invalidDefinition()
  }
  return value
}

function optionalDefinitionString(value: unknown): string | undefined {
  return value == null ? undefined : requireString(value, true)
}

function requirePositiveInteger(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) <= 0) throw invalidDefinition()
  return value as number
}

function optionalNonNegativeInteger(value: unknown): number | undefined {
  if (value == null) return undefined
  if (!Number.isInteger(value) || (value as number) < 0) throw invalidDefinition()
  return value as number
}

function requireFiniteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw invalidDefinition()
  return value
}

function optionalFiniteNumber(value: unknown): number | null {
  return value == null ? null : requireFiniteNumber(value)
}

function requireBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw invalidDefinition()
  return value
}

function requireDate(value: unknown): Date {
  const date = new Date(requireString(value))
  if (!Number.isFinite(date.getTime())) throw invalidDefinition()
  return date
}

function requireEnum<const T extends readonly string[]>(
  value: unknown,
  allowed: T
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) throw invalidDefinition()
  return value
}

function invalidDefinition(): Error {
  return new Error("KPI_DEFINITION_INVALID_PERSISTED_DATA")
}

import type { ChangeSet } from "../types/planning-contracts"

export type PlanningChangeSetRow = Readonly<{
  id: unknown
  company_id: unknown
  scenario_id: unknown
  change_type: unknown
  payload: unknown
  version: unknown
}>

export function mapPlanningChangeSetRow(
  row: PlanningChangeSetRow
): ChangeSet {
  if (
    !isNonEmptyString(row.id) ||
    !isNonEmptyString(row.company_id) ||
    !isNonEmptyString(row.scenario_id) ||
    !isNonEmptyString(row.change_type) ||
    !Number.isInteger(row.version) ||
    (row.version as number) <= 0 ||
    !isJsonObject(row.payload)
  ) {
    throw new Error("PLANNING_CHANGE_SET_INVALID_DATA")
  }

  return Object.freeze({
    id: row.id,
    companyId: row.company_id,
    scenarioId: row.scenario_id,
    changeType: row.change_type,
    payload: freezeJsonObject(row.payload),
    version: row.version as number,
  })
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isJsonObject(
  value: unknown
): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  return Object.values(value).every(isJsonValue)
}

function isJsonValue(value: unknown): boolean {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue)
  }

  return isJsonObject(value)
}

function freezeJsonObject(
  value: Record<string, unknown>
): Readonly<Record<string, unknown>> {
  return freezeJsonValue(value) as Readonly<Record<string, unknown>>
}

function freezeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(freezeJsonValue))
  }

  if (value !== null && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
          key,
          freezeJsonValue(child),
        ])
      )
    )
  }

  return value
}

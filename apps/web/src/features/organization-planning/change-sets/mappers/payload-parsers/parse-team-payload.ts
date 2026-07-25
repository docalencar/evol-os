import type {
  TeamArchivePayload,
  TeamCreatePayload,
  TeamUpdatePayload,
} from "../../types/team-change-set"

export type TeamPayloadByChangeType = {
  "team.create": TeamCreatePayload
  "team.update": TeamUpdatePayload
  "team.archive": TeamArchivePayload
}

export type TeamChangeType =
  keyof TeamPayloadByChangeType

export function parseTeamPayload<
  TChangeType extends TeamChangeType,
>(
  changeType: TChangeType,
  value: unknown
): TeamPayloadByChangeType[TChangeType] {
  const payload = readObject(value, changeType)

  switch (changeType) {
    case "team.create":
      return parseCreatePayload(payload) as TeamPayloadByChangeType[TChangeType]

    case "team.update":
      return parseUpdatePayload(payload) as TeamPayloadByChangeType[TChangeType]

    case "team.archive":
      return parseArchivePayload(payload) as TeamPayloadByChangeType[TChangeType]

    default:
      throw unsupportedChangeTypeError(changeType)
  }
}

function parseCreatePayload(
  payload: Record<string, unknown>
): TeamCreatePayload {
  return Object.freeze({
    teamId: readRequiredString(payload, "teamId", "team.create"),
    name: readRequiredString(payload, "name", "team.create"),
    code: readNullableString(payload, "code", "team.create"),
    description: readNullableString(payload, "description", "team.create"),
    departmentId: readRequiredString(payload, "departmentId", "team.create"),
  })
}

function parseUpdatePayload(
  payload: Record<string, unknown>
): TeamUpdatePayload {
  const parsed: TeamUpdatePayload = {
    teamId: readRequiredString(payload, "teamId", "team.update"),
  }

  if (hasOwn(payload, "name")) {
    parsed.name = readRequiredString(payload, "name", "team.update")
  }

  if (hasOwn(payload, "code")) {
    parsed.code = readNullableString(payload, "code", "team.update")
  }

  if (hasOwn(payload, "description")) {
    parsed.description = readNullableString(payload, "description", "team.update")
  }

  if (hasOwn(payload, "departmentId")) {
    parsed.departmentId = readRequiredString(payload, "departmentId", "team.update")
  }

  return Object.freeze(parsed)
}

function parseArchivePayload(
  payload: Record<string, unknown>
): TeamArchivePayload {
  return Object.freeze({
    teamId: readRequiredString(payload, "teamId", "team.archive"),
  })
}

function readObject(
  value: unknown,
  changeType: TeamChangeType
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw invalidPayloadError(
      changeType,
      "o payload deve ser um objeto"
    )
  }

  return value as Record<string, unknown>
}

function readRequiredString(
  payload: Record<string, unknown>,
  field: string,
  changeType: TeamChangeType
): string {
  const value = payload[field]

  if (typeof value !== "string" || value.trim().length === 0) {
    throw invalidFieldError(
      changeType,
      field,
      "uma string não vazia"
    )
  }

  return value.trim()
}

function readNullableString(
  payload: Record<string, unknown>,
  field: string,
  changeType: TeamChangeType
): string | null {
  const value = payload[field]

  if (value === null) {
    return null
  }

  if (typeof value !== "string") {
    throw invalidFieldError(
      changeType,
      field,
      "uma string ou null"
    )
  }

  const normalized = value.trim()

  return normalized.length > 0
    ? normalized
    : null
}

function hasOwn(
  payload: Record<string, unknown>,
  field: string
): boolean {
  return Object.prototype.hasOwnProperty.call(
    payload,
    field
  )
}

function invalidFieldError(
  changeType: TeamChangeType,
  field: string,
  expected: string
): Error {
  return invalidPayloadError(
    changeType,
    `o campo ${field} deve ser ${expected}`
  )
}

function invalidPayloadError(
  changeType: TeamChangeType,
  message: string
): Error {
  return new Error(
    `Invalid payload for ${changeType}: ${message}.`
  )
}

function unsupportedChangeTypeError(
  value: never
): Error {
  return new Error(
    `Unsupported team change type: ${String(value)}.`
  )
}

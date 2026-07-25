import type {
  PositionArchivePayload,
  PositionCreatePayload,
  PositionMovePayload,
  PositionUpdatePayload,
} from "../../types/position-change-set"

export type PositionPayloadByChangeType = {
  "position.create": PositionCreatePayload
  "position.update": PositionUpdatePayload
  "position.move": PositionMovePayload
  "position.archive": PositionArchivePayload
}

export type PositionChangeType =
  keyof PositionPayloadByChangeType

export function parsePositionPayload<
  TChangeType extends PositionChangeType,
>(
  changeType: TChangeType,
  value: unknown
): PositionPayloadByChangeType[TChangeType] {
  const payload = readObject(value, changeType)

  switch (changeType) {
    case "position.create":
      return parseCreatePayload(
        payload
      ) as PositionPayloadByChangeType[TChangeType]

    case "position.update":
      return parseUpdatePayload(
        payload
      ) as PositionPayloadByChangeType[TChangeType]

    case "position.move":
      return parseMovePayload(
        payload
      ) as PositionPayloadByChangeType[TChangeType]

    case "position.archive":
      return parseArchivePayload(
        payload
      ) as PositionPayloadByChangeType[TChangeType]

    default:
      throw unsupportedChangeTypeError(changeType)
  }
}

function parseCreatePayload(
  payload: Record<string, unknown>
): PositionCreatePayload {
  return Object.freeze({
    title: readRequiredString(
      payload,
      "title",
      "position.create"
    ),
    code: readNullableString(
      payload,
      "code",
      "position.create"
    ),
    departmentId: readRequiredString(
      payload,
      "departmentId",
      "position.create"
    ),
    teamId: readNullableString(
      payload,
      "teamId",
      "position.create"
    ),
    reportsToPositionId: readNullableString(
      payload,
      "reportsToPositionId",
      "position.create"
    ),
  })
}

function parseUpdatePayload(
  payload: Record<string, unknown>
): PositionUpdatePayload {
  return Object.freeze({
    title: readRequiredString(
      payload,
      "title",
      "position.update"
    ),
    code: readNullableString(
      payload,
      "code",
      "position.update"
    ),
    departmentId: readRequiredString(
      payload,
      "departmentId",
      "position.update"
    ),
    teamId: readNullableString(
      payload,
      "teamId",
      "position.update"
    ),
    reportsToPositionId: readNullableString(
      payload,
      "reportsToPositionId",
      "position.update"
    ),
  })
}

function parseMovePayload(
  payload: Record<string, unknown>
): PositionMovePayload {
  return Object.freeze({
    departmentId: readRequiredString(
      payload,
      "departmentId",
      "position.move"
    ),
    teamId: readNullableString(
      payload,
      "teamId",
      "position.move"
    ),
    reportsToPositionId: readNullableString(
      payload,
      "reportsToPositionId",
      "position.move"
    ),
  })
}

function parseArchivePayload(
  payload: Record<string, unknown>
): PositionArchivePayload {
  if (!hasOwn(payload, "reason")) {
    return Object.freeze({})
  }

  return Object.freeze({
    reason: readOptionalString(
      payload,
      "reason",
      "position.archive"
    ),
  })
}

function readObject(
  value: unknown,
  changeType: PositionChangeType
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
  changeType: PositionChangeType
): string {
  const value = payload[field]

  if (typeof value !== "string") {
    throw invalidFieldError(
      changeType,
      field,
      "uma string não vazia"
    )
  }

  const normalizedValue = value.trim()

  if (normalizedValue.length === 0) {
    throw invalidFieldError(
      changeType,
      field,
      "uma string não vazia"
    )
  }

  return normalizedValue
}

function readNullableString(
  payload: Record<string, unknown>,
  field: string,
  changeType: PositionChangeType
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

  const normalizedValue = value.trim()

  return normalizedValue.length > 0
    ? normalizedValue
    : null
}

function readOptionalString(
  payload: Record<string, unknown>,
  field: string,
  changeType: PositionChangeType
): string | undefined {
  const value = payload[field]

  if (typeof value !== "string") {
    throw invalidFieldError(
      changeType,
      field,
      "uma string"
    )
  }

  const normalizedValue = value.trim()

  return normalizedValue.length > 0
    ? normalizedValue
    : undefined
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
  changeType: PositionChangeType,
  field: string,
  expected: string
): Error {
  return invalidPayloadError(
    changeType,
    `o campo ${field} deve ser ${expected}`
  )
}

function invalidPayloadError(
  changeType: PositionChangeType,
  message: string
): Error {
  return new Error(
    `Invalid payload for ${changeType}: ${message}.`
  )
}

function unsupportedChangeTypeError(
  changeType: never
): Error {
  return new Error(
    `Unsupported position change type: ${String(changeType)}.`
  )
}

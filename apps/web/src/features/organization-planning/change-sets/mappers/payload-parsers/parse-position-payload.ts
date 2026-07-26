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

  const payload =
    readObject(value, changeType)

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
      throw new Error(
        `Unsupported position change type: ${String(changeType)}`
      )
  }
}


function parseCreatePayload(
  payload: Record<string, unknown>
): PositionCreatePayload {

  return Object.freeze({
    positionId:
      readRequiredString(
        payload,
        "positionId"
      ),

    title:
      readRequiredString(
        payload,
        "title"
      ),

    code:
      readNullableString(
        payload,
        "code"
      ),

    departmentId:
      readRequiredString(
        payload,
        "departmentId"
      ),

    teamId:
      readNullableString(
        payload,
        "teamId"
      ),

    hierarchicalLevel:
      readNullableString(
        payload,
        "hierarchicalLevel"
      ),

    reportsToPositionId:
      readNullableString(
        payload,
        "reportsToPositionId"
      ),
  })
}


function parseUpdatePayload(
  payload: Record<string, unknown>
): PositionUpdatePayload {

  const parsed: {
    positionId: string
    title?: string
    code?: string | null
    departmentId?: string
    teamId?: string | null
    hierarchicalLevel?: string | null
    reportsToPositionId?: string | null
  } = {
    positionId:
      readRequiredString(
        payload,
        "positionId"
      ),
  }


  if (hasOwn(payload, "title")) {
    parsed.title =
      readRequiredString(
        payload,
        "title"
      )
  }


  if (hasOwn(payload, "code")) {
    parsed.code =
      readNullableString(
        payload,
        "code"
      )
  }


  if (hasOwn(payload, "departmentId")) {
    parsed.departmentId =
      readRequiredString(
        payload,
        "departmentId"
      )
  }


  if (hasOwn(payload, "teamId")) {
    parsed.teamId =
      readNullableString(
        payload,
        "teamId"
      )
  }


  if (hasOwn(payload, "hierarchicalLevel")) {
    parsed.hierarchicalLevel =
      readNullableString(
        payload,
        "hierarchicalLevel"
      )
  }


  if (hasOwn(payload, "reportsToPositionId")) {
    parsed.reportsToPositionId =
      readNullableString(
        payload,
        "reportsToPositionId"
      )
  }


  return Object.freeze(
    parsed
  ) as PositionUpdatePayload
}


function parseMovePayload(
  payload: Record<string, unknown>
): PositionMovePayload {

  return Object.freeze({
    positionId:
      readRequiredString(
        payload,
        "positionId"
      ),

    fromDepartmentId:
      readRequiredString(
        payload,
        "fromDepartmentId"
      ),

    toDepartmentId:
      readRequiredString(
        payload,
        "toDepartmentId"
      ),

    fromTeamId:
      readNullableString(
        payload,
        "fromTeamId"
      ),

    toTeamId:
      readNullableString(
        payload,
        "toTeamId"
      ),
  })
}


function parseArchivePayload(
  payload: Record<string, unknown>
): PositionArchivePayload {

  return Object.freeze({
    positionId:
      readRequiredString(
        payload,
        "positionId"
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
    throw new Error(
      `Invalid payload for ${changeType}`
    )
  }

  return value as Record<string, unknown>
}


function readRequiredString(
  payload: Record<string, unknown>,
  field: string
): string {

  const value =
    payload[field]


  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `${field} inválido`
    )
  }


  return value.trim()
}


function readNullableString(
  payload: Record<string, unknown>,
  field: string
): string | null {

  const value =
    payload[field]


  if (
    value === null ||
    value === undefined
  ) {
    return null
  }


  if (
    typeof value !== "string"
  ) {
    throw new Error(
      `${field} inválido`
    )
  }


  const normalized =
    value.trim()


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

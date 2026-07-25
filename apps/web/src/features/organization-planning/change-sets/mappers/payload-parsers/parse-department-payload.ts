import type {
  DepartmentArchivePayload,
  DepartmentCreatePayload,
  DepartmentUpdatePayload,
} from "../../types/department-change-set"

export type DepartmentPayloadByChangeType = {
  "department.create": DepartmentCreatePayload
  "department.update": DepartmentUpdatePayload
  "department.archive": DepartmentArchivePayload
}

export type DepartmentChangeType =
  keyof DepartmentPayloadByChangeType

export function parseDepartmentPayload<
  TChangeType extends DepartmentChangeType,
>(
  changeType: TChangeType,
  value: unknown
): DepartmentPayloadByChangeType[TChangeType] {
  const payload = readObject(value, changeType)

  switch (changeType) {
    case "department.create":
      return parseCreatePayload(
        payload
      ) as DepartmentPayloadByChangeType[TChangeType]

    case "department.update":
      return parseUpdatePayload(
        payload
      ) as DepartmentPayloadByChangeType[TChangeType]

    case "department.archive":
      return parseArchivePayload(
        payload
      ) as DepartmentPayloadByChangeType[TChangeType]

    default:
      throw unsupportedChangeTypeError(changeType)
  }
}

function parseCreatePayload(
  payload: Record<string, unknown>
): DepartmentCreatePayload {
  return Object.freeze({
    departmentId: readRequiredString(
      payload,
      "departmentId",
      "department.create"
    ),
    name: readRequiredString(
      payload,
      "name",
      "department.create"
    ),
    code: readNullableString(
      payload,
      "code",
      "department.create"
    ),
    description: readNullableString(
      payload,
      "description",
      "department.create"
    ),
    parentDepartmentId: readNullableString(
      payload,
      "parentDepartmentId",
      "department.create"
    ),
  })
}

function parseUpdatePayload(
  payload: Record<string, unknown>
): DepartmentUpdatePayload {
  const parsedPayload: {
    departmentId: string
    name?: string
    code?: string | null
    description?: string | null
    parentDepartmentId?: string | null
  } = {
    departmentId: readRequiredString(
      payload,
      "departmentId",
      "department.update"
    ),
  }

  if (hasOwn(payload, "name")) {
    parsedPayload.name = readRequiredString(
      payload,
      "name",
      "department.update"
    )
  }

  if (hasOwn(payload, "code")) {
    parsedPayload.code = readNullableString(
      payload,
      "code",
      "department.update"
    )
  }

  if (hasOwn(payload, "description")) {
    parsedPayload.description = readNullableString(
      payload,
      "description",
      "department.update"
    )
  }

  if (hasOwn(payload, "parentDepartmentId")) {
    parsedPayload.parentDepartmentId =
      readNullableString(
        payload,
        "parentDepartmentId",
        "department.update"
      )
  }

  return Object.freeze(parsedPayload)
}

function parseArchivePayload(
  payload: Record<string, unknown>
): DepartmentArchivePayload {
  return Object.freeze({
    departmentId: readRequiredString(
      payload,
      "departmentId",
      "department.archive"
    ),
  })
}

function readObject(
  value: unknown,
  changeType: DepartmentChangeType
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
  changeType: DepartmentChangeType
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
  changeType: DepartmentChangeType
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
  changeType: DepartmentChangeType,
  field: string,
  expected: string
): Error {
  return invalidPayloadError(
    changeType,
    `o campo ${field} deve ser ${expected}`
  )
}

function invalidPayloadError(
  changeType: DepartmentChangeType,
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
    `Unsupported department change type: ${String(changeType)}.`
  )
}

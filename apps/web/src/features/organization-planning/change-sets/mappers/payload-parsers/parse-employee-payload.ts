import type {
  EmployeeArchivePayload,
  EmployeeCreatePayload,
  EmployeeMovePayload,
  EmployeeTerminatePayload,
  EmployeeUpdatePayload,
} from "../../types/employee-change-set"

export type EmployeePayloadByChangeType = {
  "employee.create": EmployeeCreatePayload
  "employee.update": EmployeeUpdatePayload
  "employee.move": EmployeeMovePayload
  "employee.terminate": EmployeeTerminatePayload
  "employee.archive": EmployeeArchivePayload
}

export type EmployeeChangeType =
  keyof EmployeePayloadByChangeType

export function parseEmployeePayload<
  TChangeType extends EmployeeChangeType,
>(
  changeType: TChangeType,
  value: unknown
): EmployeePayloadByChangeType[TChangeType] {
  const payload = readObject(value, changeType)

  switch (changeType) {
    case "employee.create":
      return parseCreatePayload(
        payload
      ) as EmployeePayloadByChangeType[TChangeType]

    case "employee.update":
      return parseUpdatePayload(
        payload
      ) as EmployeePayloadByChangeType[TChangeType]

    case "employee.move":
      return parseMovePayload(
        payload
      ) as EmployeePayloadByChangeType[TChangeType]

    case "employee.terminate":
      return parseTerminatePayload(
        payload
      ) as EmployeePayloadByChangeType[TChangeType]

    case "employee.archive":
      return parseArchivePayload(
        payload
      ) as EmployeePayloadByChangeType[TChangeType]

    default:
      throw unsupportedChangeTypeError(changeType)
  }
}

function parseCreatePayload(
  payload: Record<string, unknown>
): EmployeeCreatePayload {
  return Object.freeze({
    name: readRequiredString(
      payload,
      "name",
      "employee.create"
    ),
    email: readNullableString(
      payload,
      "email",
      "employee.create"
    ),
    positionId: readNullableString(
      payload,
      "positionId",
      "employee.create"
    ),
    departmentId: readNullableString(
      payload,
      "departmentId",
      "employee.create"
    ),
    teamId: readNullableString(
      payload,
      "teamId",
      "employee.create"
    ),
    managerEmployeeId: readNullableString(
      payload,
      "managerEmployeeId",
      "employee.create"
    ),
    admissionDate: readNullableString(
      payload,
      "admissionDate",
      "employee.create"
    ),
  })
}

function parseUpdatePayload(
  payload: Record<string, unknown>
): EmployeeUpdatePayload {
  return Object.freeze({
    name: readRequiredString(
      payload,
      "name",
      "employee.update"
    ),
    email: readNullableString(
      payload,
      "email",
      "employee.update"
    ),
    positionId: readNullableString(
      payload,
      "positionId",
      "employee.update"
    ),
    departmentId: readNullableString(
      payload,
      "departmentId",
      "employee.update"
    ),
    teamId: readNullableString(
      payload,
      "teamId",
      "employee.update"
    ),
    managerEmployeeId: readNullableString(
      payload,
      "managerEmployeeId",
      "employee.update"
    ),
    admissionDate: readNullableString(
      payload,
      "admissionDate",
      "employee.update"
    ),
  })
}

function parseMovePayload(
  payload: Record<string, unknown>
): EmployeeMovePayload {
  return Object.freeze({
    positionId: readNullableString(
      payload,
      "positionId",
      "employee.move"
    ),
    departmentId: readNullableString(
      payload,
      "departmentId",
      "employee.move"
    ),
    teamId: readNullableString(
      payload,
      "teamId",
      "employee.move"
    ),
    managerEmployeeId: readNullableString(
      payload,
      "managerEmployeeId",
      "employee.move"
    ),
    effectiveDate: readNullableString(
      payload,
      "effectiveDate",
      "employee.move"
    ),
  })
}

function parseTerminatePayload(
  payload: Record<string, unknown>
): EmployeeTerminatePayload {
  return Object.freeze({
    terminationDate: readRequiredString(
      payload,
      "terminationDate",
      "employee.terminate"
    ),
    reason: readNullableString(
      payload,
      "reason",
      "employee.terminate"
    ),
    notes: readNullableString(
      payload,
      "notes",
      "employee.terminate"
    ),
  })
}

function parseArchivePayload(
  payload: Record<string, unknown>
): EmployeeArchivePayload {
  const parsedPayload: {
    reason?: string
  } = {}

  if (hasOwn(payload, "reason")) {
    parsedPayload.reason = readOptionalString(
      payload,
      "reason",
      "employee.archive"
    )
  }

  return Object.freeze(parsedPayload)
}

function readObject(
  value: unknown,
  changeType: EmployeeChangeType
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
  changeType: EmployeeChangeType
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
  changeType: EmployeeChangeType
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
  changeType: EmployeeChangeType
): string {
  const value = payload[field]

  if (typeof value !== "string") {
    throw invalidFieldError(
      changeType,
      field,
      "uma string"
    )
  }

  return value.trim()
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
  changeType: EmployeeChangeType,
  field: string,
  expected: string
): Error {
  return invalidPayloadError(
    changeType,
    `o campo ${field} deve ser ${expected}`
  )
}

function invalidPayloadError(
  changeType: EmployeeChangeType,
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
    `Unsupported employee change type: ${String(changeType)}.`
  )
}

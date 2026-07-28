import type { ChangeSet } from "../../types/planning-contracts"
import type { ProjectionIssue } from "../contracts"

export const EMPLOYEE_CHANGE_TYPES = [
  "employee.create",
  "employee.update",
  "employee.transfer",
  "employee.terminate",
] as const

export type EmployeeChangeType =
  (typeof EMPLOYEE_CHANGE_TYPES)[number]

export type EmployeeCreatePayload = Readonly<{
  employeeId: string
  positionId: string | null
}>

export type EmployeeUpdatePayload = Readonly<{
  employeeId: string
  positionId?: string | null
}>

export type EmployeeTransferPayload = Readonly<{
  employeeId: string
  positionId: string | null
}>

export type ParsedEmployeeChangeSet =
  | Readonly<{
      id: string
      changeType: "employee.create"
      payload: EmployeeCreatePayload
    }>
  | Readonly<{
      id: string
      changeType: "employee.update"
      payload: EmployeeUpdatePayload
    }>
  | Readonly<{
      id: string
      changeType: "employee.transfer"
      payload: EmployeeTransferPayload
    }>

export type EmployeeChangeSetParseResult =
  | Readonly<{
      success: true
      changeSet: ParsedEmployeeChangeSet
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

export function isEmployeeChangeType(
  changeType: string
): changeType is EmployeeChangeType {
  return EMPLOYEE_CHANGE_TYPES.some(
    (supportedChangeType) => supportedChangeType === changeType
  )
}

export function parseEmployeeChangeSet(
  changeSet: ChangeSet
): EmployeeChangeSetParseResult {
  switch (changeSet.changeType) {
    case "employee.create":
      return parseCreateChangeSet(changeSet)

    case "employee.update":
      return parseUpdateChangeSet(changeSet)

    case "employee.transfer":
      return parseTransferChangeSet(changeSet)

    case "employee.terminate":
      // Reconhecido pelo contrato, mas a semântica de desligamento ainda não é
      // suportada nesta fase (adiada para ADR de extensão de contrato). Falha de
      // forma explícita e determinística com o erro padrão de operação não
      // suportada.
      return unsupportedChangeType(changeSet)

    default:
      return unsupportedChangeType(changeSet)
  }
}

function unsupportedChangeType(
  changeSet: ChangeSet
): EmployeeChangeSetParseResult {
  return failure(
    changeSet,
    "employee.change_set.unsupported",
    `O tipo ${changeSet.changeType} não é suportado pelo executor de colaboradores.`
  )
}

function parseCreateChangeSet(
  changeSet: ChangeSet
): EmployeeChangeSetParseResult {
  const employeeId = readRequiredString(
    changeSet,
    "employeeId"
  )

  if (!employeeId.success) {
    return employeeId
  }

  const positionId = readOptionalNullableString(
    changeSet,
    "positionId"
  )

  if (!positionId.success) {
    return positionId
  }

  return Object.freeze({
    success: true,
    changeSet: Object.freeze({
      id: changeSet.id,
      changeType: "employee.create",
      payload: Object.freeze({
        employeeId: employeeId.value,
        positionId: positionId.value,
      }),
    }),
  })
}

function parseUpdateChangeSet(
  changeSet: ChangeSet
): EmployeeChangeSetParseResult {
  const employeeId = readRequiredString(
    changeSet,
    "employeeId"
  )

  if (!employeeId.success) {
    return employeeId
  }

  const payload: {
    employeeId: string
    positionId?: string | null
  } = {
    employeeId: employeeId.value,
  }

  if (hasOwn(changeSet.payload, "positionId")) {
    const positionId = readNullableString(
      changeSet,
      "positionId"
    )

    if (!positionId.success) {
      return positionId
    }

    payload.positionId = positionId.value
  }

  return Object.freeze({
    success: true,
    changeSet: Object.freeze({
      id: changeSet.id,
      changeType: "employee.update",
      payload: Object.freeze(payload),
    }),
  })
}

function parseTransferChangeSet(
  changeSet: ChangeSet
): EmployeeChangeSetParseResult {
  const employeeId = readRequiredString(
    changeSet,
    "employeeId"
  )

  if (!employeeId.success) {
    return employeeId
  }

  const positionId = readNullableString(
    changeSet,
    "positionId"
  )

  if (!positionId.success) {
    return positionId
  }

  return Object.freeze({
    success: true,
    changeSet: Object.freeze({
      id: changeSet.id,
      changeType: "employee.transfer",
      payload: Object.freeze({
        employeeId: employeeId.value,
        positionId: positionId.value,
      }),
    }),
  })
}

type StringReadResult =
  | Readonly<{
      success: true
      value: string
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

type NullableStringReadResult =
  | Readonly<{
      success: true
      value: string | null
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

function readRequiredString(
  changeSet: ChangeSet,
  field: string
): StringReadResult {
  const value = changeSet.payload[field]

  if (typeof value !== "string") {
    return invalidField(changeSet, field, "uma string")
  }

  const normalized = value.trim()

  if (normalized.length === 0) {
    return invalidField(
      changeSet,
      field,
      "uma string não vazia"
    )
  }

  return Object.freeze({
    success: true,
    value: normalized,
  })
}

function readOptionalNullableString(
  changeSet: ChangeSet,
  field: string
): NullableStringReadResult {
  if (!hasOwn(changeSet.payload, field)) {
    return Object.freeze({
      success: true,
      value: null,
    })
  }

  return readNullableString(changeSet, field)
}

function readNullableString(
  changeSet: ChangeSet,
  field: string
): NullableStringReadResult {
  const value = changeSet.payload[field]

  if (value === null) {
    return Object.freeze({
      success: true,
      value: null,
    })
  }

  if (typeof value !== "string") {
    return invalidField(
      changeSet,
      field,
      "uma string ou null"
    )
  }

  const normalized = value.trim()

  return Object.freeze({
    success: true,
    value: normalized.length > 0 ? normalized : null,
  })
}

function invalidField(
  changeSet: ChangeSet,
  field: string,
  expected: string
): Readonly<{
  success: false
  issue: ProjectionIssue
}> {
  return failure(
    changeSet,
    "employee.change_set.invalid_payload",
    `O campo ${field} do change set ${changeSet.id} deve ser ${expected}.`
  )
}

function failure(
  changeSet: ChangeSet,
  code: string,
  message: string
): Readonly<{
  success: false
  issue: ProjectionIssue
}> {
  return Object.freeze({
    success: false,
    issue: Object.freeze({
      code,
      message,
      changeSetId: changeSet.id,
    }),
  })
}

function hasOwn(
  value: Readonly<Record<string, unknown>>,
  property: string
): boolean {
  return Object.prototype.hasOwnProperty.call(value, property)
}

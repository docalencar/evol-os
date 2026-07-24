import type { ChangeSet } from "../../types/planning-contracts"
import {
  PROJECTED_EMPLOYEE_STATUSES,
  type ProjectedEmployeeStatus,
  type ProjectionIssue,
} from "../contracts"

export const EMPLOYEE_CHANGE_TYPES = [
  "employee.create",
  "employee.update",
  "employee.archive",
  "employee.move",
] as const

export type EmployeeChangeType =
  (typeof EMPLOYEE_CHANGE_TYPES)[number]

export type EmployeeCreatePayload = Readonly<{
  employeeId: string
  fullName: string
  email: string | null
  status: ProjectedEmployeeStatus
  managerId: string | null
  departmentId: string | null
  teamId: string | null
  positionId: string | null
}>

export type EmployeeUpdatePayload = Readonly<{
  employeeId: string
  fullName?: string
  email?: string | null
  status?: ProjectedEmployeeStatus
  managerId?: string | null
}>

export type EmployeeArchivePayload = Readonly<{
  employeeId: string
}>

export type EmployeeMovePayload = Readonly<{
  employeeId: string
  departmentId: string | null
  teamId: string | null
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
      changeType: "employee.archive"
      payload: EmployeeArchivePayload
    }>
  | Readonly<{
      id: string
      changeType: "employee.move"
      payload: EmployeeMovePayload
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
    (supportedChangeType) =>
      supportedChangeType === changeType
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

    case "employee.archive":
      return parseArchiveChangeSet(changeSet)

    case "employee.move":
      return parseMoveChangeSet(changeSet)

    default:
      return failure(
        changeSet.id,
        `O tipo ${changeSet.changeType} não é suportado pelo executor de colaboradores.`
      )
  }
}

function parseCreateChangeSet(
  changeSet: ChangeSet
): EmployeeChangeSetParseResult {
  const payloadResult = readPayload(changeSet)

  if (!payloadResult.success) {
    return payloadResult
  }

  const employeeIdResult = readRequiredString(
    payloadResult.payload,
    "employeeId",
    changeSet.id
  )

  if (!employeeIdResult.success) {
    return employeeIdResult
  }

  const fullNameResult = readRequiredString(
    payloadResult.payload,
    "fullName",
    changeSet.id
  )

  if (!fullNameResult.success) {
    return fullNameResult
  }

  const emailResult = readNullableString(
    payloadResult.payload,
    "email",
    changeSet.id,
    true
  )

  if (!emailResult.success) {
    return emailResult
  }

  const statusResult = readEmployeeStatus(
    payloadResult.payload,
    "status",
    changeSet.id,
    true
  )

  if (!statusResult.success) {
    return statusResult
  }

  const managerIdResult = readNullableString(
    payloadResult.payload,
    "managerId",
    changeSet.id,
    true
  )

  if (!managerIdResult.success) {
    return managerIdResult
  }

  const departmentIdResult = readNullableString(
    payloadResult.payload,
    "departmentId",
    changeSet.id,
    true
  )

  if (!departmentIdResult.success) {
    return departmentIdResult
  }

  const teamIdResult = readNullableString(
    payloadResult.payload,
    "teamId",
    changeSet.id,
    true
  )

  if (!teamIdResult.success) {
    return teamIdResult
  }

  const positionIdResult = readNullableString(
    payloadResult.payload,
    "positionId",
    changeSet.id,
    true
  )

  if (!positionIdResult.success) {
    return positionIdResult
  }

  return success({
    id: changeSet.id,
    changeType: "employee.create",
    payload: Object.freeze({
      employeeId: employeeIdResult.value,
      fullName: fullNameResult.value,
      email: emailResult.value,
      status: statusResult.value,
      managerId: managerIdResult.value,
      departmentId: departmentIdResult.value,
      teamId: teamIdResult.value,
      positionId: positionIdResult.value,
    }),
  })
}

function parseUpdateChangeSet(
  changeSet: ChangeSet
): EmployeeChangeSetParseResult {
  const payloadResult = readPayload(changeSet)

  if (!payloadResult.success) {
    return payloadResult
  }

  const employeeIdResult = readRequiredString(
    payloadResult.payload,
    "employeeId",
    changeSet.id
  )

  if (!employeeIdResult.success) {
    return employeeIdResult
  }

  const fullNameResult = readOptionalString(
    payloadResult.payload,
    "fullName",
    changeSet.id
  )

  if (!fullNameResult.success) {
    return fullNameResult
  }

  const emailResult = readNullableString(
    payloadResult.payload,
    "email",
    changeSet.id,
    false
  )

  if (!emailResult.success) {
    return emailResult
  }

  const statusResult = readEmployeeStatus(
    payloadResult.payload,
    "status",
    changeSet.id,
    false
  )

  if (!statusResult.success) {
    return statusResult
  }

  const managerIdResult = readNullableString(
    payloadResult.payload,
    "managerId",
    changeSet.id,
    false
  )

  if (!managerIdResult.success) {
    return managerIdResult
  }

  return success({
    id: changeSet.id,
    changeType: "employee.update",
    payload: Object.freeze({
      employeeId: employeeIdResult.value,
      ...(fullNameResult.value !== undefined
        ? { fullName: fullNameResult.value }
        : {}),
      ...(emailResult.present
        ? { email: emailResult.value }
        : {}),
      ...(statusResult.present
        ? { status: statusResult.value }
        : {}),
      ...(managerIdResult.present
        ? { managerId: managerIdResult.value }
        : {}),
    }),
  })
}

function parseArchiveChangeSet(
  changeSet: ChangeSet
): EmployeeChangeSetParseResult {
  const payloadResult = readPayload(changeSet)

  if (!payloadResult.success) {
    return payloadResult
  }

  const employeeIdResult = readRequiredString(
    payloadResult.payload,
    "employeeId",
    changeSet.id
  )

  if (!employeeIdResult.success) {
    return employeeIdResult
  }

  return success({
    id: changeSet.id,
    changeType: "employee.archive",
    payload: Object.freeze({
      employeeId: employeeIdResult.value,
    }),
  })
}

function parseMoveChangeSet(
  changeSet: ChangeSet
): EmployeeChangeSetParseResult {
  const payloadResult = readPayload(changeSet)

  if (!payloadResult.success) {
    return payloadResult
  }

  const employeeIdResult = readRequiredString(
    payloadResult.payload,
    "employeeId",
    changeSet.id
  )

  if (!employeeIdResult.success) {
    return employeeIdResult
  }

  const departmentIdResult = readNullableString(
    payloadResult.payload,
    "departmentId",
    changeSet.id,
    true
  )

  if (!departmentIdResult.success) {
    return departmentIdResult
  }

  const teamIdResult = readNullableString(
    payloadResult.payload,
    "teamId",
    changeSet.id,
    true
  )

  if (!teamIdResult.success) {
    return teamIdResult
  }

  const positionIdResult = readNullableString(
    payloadResult.payload,
    "positionId",
    changeSet.id,
    true
  )

  if (!positionIdResult.success) {
    return positionIdResult
  }

  return success({
    id: changeSet.id,
    changeType: "employee.move",
    payload: Object.freeze({
      employeeId: employeeIdResult.value,
      departmentId: departmentIdResult.value,
      teamId: teamIdResult.value,
      positionId: positionIdResult.value,
    }),
  })
}

type PayloadReadResult =
  | Readonly<{
      success: true
      payload: Record<string, unknown>
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

function readPayload(
  changeSet: ChangeSet
): PayloadReadResult {
  if (
    typeof changeSet.payload !== "object" ||
    changeSet.payload === null ||
    Array.isArray(changeSet.payload)
  ) {
    return failure(
      changeSet.id,
      `O payload do change set ${changeSet.id} deve ser um objeto.`
    )
  }

  return Object.freeze({
    success: true,
    payload: changeSet.payload as Record<
      string,
      unknown
    >,
  })
}

type RequiredStringResult =
  | Readonly<{
      success: true
      value: string
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

function readRequiredString(
  payload: Record<string, unknown>,
  field: string,
  changeSetId: string
): RequiredStringResult {
  const value = payload[field]

  if (typeof value !== "string") {
    return failure(
      changeSetId,
      `O campo ${field} do change set ${changeSetId} deve ser uma string.`
    )
  }

  if (value.trim().length === 0) {
    return failure(
      changeSetId,
      `O campo ${field} do change set ${changeSetId} não pode estar vazio.`
    )
  }

  return Object.freeze({
    success: true,
    value,
  })
}

type OptionalStringResult =
  | Readonly<{
      success: true
      value: string | undefined
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

function readOptionalString(
  payload: Record<string, unknown>,
  field: string,
  changeSetId: string
): OptionalStringResult {
  if (!(field in payload)) {
    return Object.freeze({
      success: true,
      value: undefined,
    })
  }

  return readRequiredString(
    payload,
    field,
    changeSetId
  )
}

type NullableStringResult =
  | Readonly<{
      success: true
      present: boolean
      value: string | null
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

function readNullableString(
  payload: Record<string, unknown>,
  field: string,
  changeSetId: string,
  required: boolean
): NullableStringResult {
  const present = field in payload

  if (!present) {
    if (required) {
      return failure(
        changeSetId,
        `O campo ${field} é obrigatório no change set ${changeSetId}.`
      )
    }

    return Object.freeze({
      success: true,
      present: false,
      value: null,
    })
  }

  const value = payload[field]

  if (value !== null && typeof value !== "string") {
    return failure(
      changeSetId,
      `O campo ${field} do change set ${changeSetId} deve ser uma string ou null.`
    )
  }

  return Object.freeze({
    success: true,
    present: true,
    value,
  })
}

type EmployeeStatusResult =
  | Readonly<{
      success: true
      present: boolean
      value: ProjectedEmployeeStatus
    }>
  | Readonly<{
      success: false
      issue: ProjectionIssue
    }>

function readEmployeeStatus(
  payload: Record<string, unknown>,
  field: string,
  changeSetId: string,
  required: boolean
): EmployeeStatusResult {
  const present = field in payload

  if (!present) {
    if (required) {
      return failure(
        changeSetId,
        `O campo ${field} é obrigatório no change set ${changeSetId}.`
      )
    }

    return Object.freeze({
      success: true,
      present: false,
      value: "active",
    })
  }

  const value = payload[field]

  if (
    typeof value !== "string" ||
    !PROJECTED_EMPLOYEE_STATUSES.some(
      (status) => status === value
    )
  ) {
    return failure(
      changeSetId,
      `O campo ${field} do change set ${changeSetId} possui um status de colaborador inválido.`
    )
  }

  return Object.freeze({
    success: true,
    present: true,
    value: value as ProjectedEmployeeStatus,
  })
}

function success(
  changeSet: ParsedEmployeeChangeSet
): EmployeeChangeSetParseResult {
  return Object.freeze({
    success: true,
    changeSet: Object.freeze(changeSet),
  })
}

function failure(
  changeSetId: string,
  message: string
): EmployeeChangeSetParseResult & {
  success: false
} {
  return Object.freeze({
    success: false,
    issue: Object.freeze({
      code: "employee.change_set.invalid_payload",
      message,
      changeSetId,
    }),
  })
}

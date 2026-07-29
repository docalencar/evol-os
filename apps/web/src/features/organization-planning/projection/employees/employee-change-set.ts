import type { ChangeSet } from "../../types/planning-contracts"
import type { ProjectionIssue } from "../contracts"

export const EMPLOYEE_CHANGE_TYPES = [
  "employee.create",
  "employee.update",
  "employee.transfer",
  "employee.terminate",
] as const

export type EmployeeChangeType = (typeof EMPLOYEE_CHANGE_TYPES)[number]

type EmployeePlacement = Readonly<{
  positionId?: string | null
  departmentId?: string | null
  teamId?: string | null
}>

export type EmployeeCreatePayload = EmployeePlacement & Readonly<{
  employeeId: string
}>
export type EmployeeUpdatePayload = EmployeePlacement & Readonly<{
  employeeId: string
}>
export type EmployeeTransferPayload = EmployeePlacement & Readonly<{
  employeeId: string
}>
export type EmployeeTerminatePayload = Readonly<{ employeeId: string }>

export type ParsedEmployeeChangeSet =
  | Readonly<{ id: string; changeType: "employee.create"; payload: EmployeeCreatePayload }>
  | Readonly<{ id: string; changeType: "employee.update"; payload: EmployeeUpdatePayload }>
  | Readonly<{ id: string; changeType: "employee.transfer"; payload: EmployeeTransferPayload }>
  | Readonly<{ id: string; changeType: "employee.terminate"; payload: EmployeeTerminatePayload }>

export type EmployeeChangeSetParseResult =
  | Readonly<{ success: true; changeSet: ParsedEmployeeChangeSet }>
  | Readonly<{ success: false; issue: ProjectionIssue }>

export function isEmployeeChangeType(changeType: string): changeType is EmployeeChangeType {
  return EMPLOYEE_CHANGE_TYPES.some((candidate) => candidate === changeType)
}

export function parseEmployeeChangeSet(changeSet: ChangeSet): EmployeeChangeSetParseResult {
  if (!isEmployeeChangeType(changeSet.changeType)) {
    return failure(changeSet, "employee.change_set.unsupported", `O tipo ${changeSet.changeType} não é suportado pelo executor de colaboradores.`)
  }

  const employeeId = readRequiredId(changeSet, "employeeId")
  if (!employeeId.success) return employeeId

  if (changeSet.changeType === "employee.terminate") {
    return success(changeSet.id, changeSet.changeType, { employeeId: employeeId.value })
  }

  const payload: { employeeId: string; positionId?: string | null; departmentId?: string | null; teamId?: string | null } = {
    employeeId: employeeId.value,
  }

  for (const field of ["positionId", "departmentId", "teamId"] as const) {
    if (!Object.prototype.hasOwnProperty.call(changeSet.payload, field)) continue
    const value = readNullableId(changeSet, field)
    if (!value.success) return value
    payload[field] = value.value
  }

  if (changeSet.changeType === "employee.create") {
    return success(changeSet.id, changeSet.changeType, payload)
  }

  if (!hasPlacement(payload)) {
    return failure(changeSet, `employee.${changeSet.changeType.split(".")[1]}.empty_patch`, `O change set ${changeSet.id} não possui campos para movimentação.`)
  }

  return success(changeSet.id, changeSet.changeType, payload)
}

function hasPlacement(payload: EmployeePlacement): boolean {
  return ["positionId", "departmentId", "teamId"].some((field) => Object.prototype.hasOwnProperty.call(payload, field))
}

function readRequiredId(changeSet: ChangeSet, field: string) {
  const value = changeSet.payload[field]
  if (typeof value !== "string" || value.trim().length === 0) {
    return failure(changeSet, "employee.change_set.invalid_payload", `O campo ${field} do change set ${changeSet.id} deve ser uma string não vazia.`)
  }
  return Object.freeze({ success: true as const, value: value.trim() })
}

function readNullableId(changeSet: ChangeSet, field: string) {
  const value = changeSet.payload[field]
  if (value === null) return Object.freeze({ success: true as const, value: null })
  if (typeof value !== "string" || value.trim().length === 0) {
    return failure(changeSet, "employee.change_set.invalid_payload", `O campo ${field} do change set ${changeSet.id} deve ser uma string não vazia ou null.`)
  }
  return Object.freeze({ success: true as const, value: value.trim() })
}

function success<TType extends ParsedEmployeeChangeSet["changeType"]>(id: string, changeType: TType, payload: Extract<ParsedEmployeeChangeSet, { changeType: TType }>["payload"]): EmployeeChangeSetParseResult {
  return Object.freeze({ success: true, changeSet: Object.freeze({ id, changeType, payload: Object.freeze(payload) }) }) as EmployeeChangeSetParseResult
}

function failure(changeSet: ChangeSet, code: string, message: string): Readonly<{ success: false; issue: ProjectionIssue }> {
  return Object.freeze({ success: false, issue: Object.freeze({ code, message, changeSetId: changeSet.id }) })
}

import type {
  BasePlanningChangeSet,
} from "./base-change-set"

type EmployeeData = {
  name: string
  email: string | null
  positionId: string | null
  departmentId: string | null
  teamId: string | null
  managerEmployeeId: string | null
  admissionDate: string | null
}

export type EmployeeCreatePayload = EmployeeData

export type EmployeeUpdatePayload = EmployeeData

export type EmployeeMovePayload = {
  positionId: string | null
  departmentId: string | null
  teamId: string | null
  managerEmployeeId: string | null
  effectiveDate: string | null
}

export type EmployeeTerminatePayload = {
  terminationDate: string
  reason: string | null
  notes: string | null
}

export type EmployeeArchivePayload = {
  reason?: string
}

export type EmployeeCreateChangeSet =
  BasePlanningChangeSet<
    "employee.create",
    EmployeeCreatePayload
  >

export type EmployeeUpdateChangeSet =
  BasePlanningChangeSet<
    "employee.update",
    EmployeeUpdatePayload
  >

export type EmployeeMoveChangeSet =
  BasePlanningChangeSet<
    "employee.move",
    EmployeeMovePayload
  >

export type EmployeeTerminateChangeSet =
  BasePlanningChangeSet<
    "employee.terminate",
    EmployeeTerminatePayload
  >

export type EmployeeArchiveChangeSet =
  BasePlanningChangeSet<
    "employee.archive",
    EmployeeArchivePayload
  >

export type EmployeeChangeSet =
  | EmployeeCreateChangeSet
  | EmployeeUpdateChangeSet
  | EmployeeMoveChangeSet
  | EmployeeTerminateChangeSet
  | EmployeeArchiveChangeSet

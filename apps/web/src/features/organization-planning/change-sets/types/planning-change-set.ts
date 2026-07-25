import type {
  DepartmentArchivePayload,
  DepartmentChangeSet,
  DepartmentCreatePayload,
  DepartmentUpdatePayload,
} from "./department-change-set"
import type {
  EmployeeArchivePayload,
  EmployeeChangeSet,
  EmployeeCreatePayload,
  EmployeeMovePayload,
  EmployeeTerminatePayload,
  EmployeeUpdatePayload,
} from "./employee-change-set"
import type {
  PositionArchivePayload,
  PositionChangeSet,
  PositionCreatePayload,
  PositionMovePayload,
  PositionUpdatePayload,
} from "./position-change-set"
import type {
  TeamArchivePayload,
  TeamChangeSet,
  TeamCreatePayload,
  TeamUpdatePayload,
} from "./team-change-set"

export type PlanningChangeSet =
  | DepartmentChangeSet
  | TeamChangeSet
  | PositionChangeSet
  | EmployeeChangeSet

export type PlanningChangeSetPayloadByType = {
  "department.create": DepartmentCreatePayload
  "department.update": DepartmentUpdatePayload
  "department.archive": DepartmentArchivePayload

  "team.create": TeamCreatePayload
  "team.update": TeamUpdatePayload
  "team.archive": TeamArchivePayload

  "position.create": PositionCreatePayload
  "position.update": PositionUpdatePayload
  "position.move": PositionMovePayload
  "position.archive": PositionArchivePayload

  "employee.create": EmployeeCreatePayload
  "employee.update": EmployeeUpdatePayload
  "employee.move": EmployeeMovePayload
  "employee.terminate": EmployeeTerminatePayload
  "employee.archive": EmployeeArchivePayload
}

export type PlanningChangeSetByType = {
  [TChangeType in PlanningChangeSet["changeType"]]: Extract<
    PlanningChangeSet,
    {
      changeType: TChangeType
    }
  >
}

export type PlanningChangeSetPayload<
  TChangeType extends PlanningChangeSet["changeType"],
> = PlanningChangeSetPayloadByType[TChangeType]

export type PlanningChangeSetOfType<
  TChangeType extends PlanningChangeSet["changeType"],
> = PlanningChangeSetByType[TChangeType]

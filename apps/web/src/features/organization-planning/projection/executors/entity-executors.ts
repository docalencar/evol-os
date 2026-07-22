import type { ChangeSet } from "../../types/planning-contracts"
import type { ProjectionContext } from "../context"
import type { ChangeSetExecutor } from "./change-set-executor"

const DEPARTMENT_CHANGE_TYPES = [
  "department.create",
  "department.update",
  "department.archive",
] as const

const TEAM_CHANGE_TYPES = [
  "team.create",
  "team.update",
  "team.archive",
] as const

const POSITION_CHANGE_TYPES = [
  "position.create",
  "position.update",
  "position.archive",
  "position.move",
] as const

const EMPLOYEE_CHANGE_TYPES = [
  "employee.create",
  "employee.update",
  "employee.transfer",
  "employee.terminate",
] as const

const VACANCY_CHANGE_TYPES = [
  "vacancy.create",
  "vacancy.update",
  "vacancy.close",
] as const

function supports(
  supportedChangeTypes: readonly string[],
  changeSet: ChangeSet
) {
  return supportedChangeTypes.includes(changeSet.changeType)
}

export class DepartmentExecutor implements ChangeSetExecutor {
  readonly name = "DepartmentExecutor"

  canExecute(changeSet: ChangeSet) {
    return supports(DEPARTMENT_CHANGE_TYPES, changeSet)
  }

  execute(context: ProjectionContext) {
    return context
  }
}

export class TeamExecutor implements ChangeSetExecutor {
  readonly name = "TeamExecutor"

  canExecute(changeSet: ChangeSet) {
    return supports(TEAM_CHANGE_TYPES, changeSet)
  }

  execute(context: ProjectionContext) {
    return context
  }
}

export class PositionExecutor implements ChangeSetExecutor {
  readonly name = "PositionExecutor"

  canExecute(changeSet: ChangeSet) {
    return supports(POSITION_CHANGE_TYPES, changeSet)
  }

  execute(context: ProjectionContext) {
    return context
  }
}

export class EmployeeExecutor implements ChangeSetExecutor {
  readonly name = "EmployeeExecutor"

  canExecute(changeSet: ChangeSet) {
    return supports(EMPLOYEE_CHANGE_TYPES, changeSet)
  }

  execute(context: ProjectionContext) {
    return context
  }
}

export class VacancyExecutor implements ChangeSetExecutor {
  readonly name = "VacancyExecutor"

  canExecute(changeSet: ChangeSet) {
    return supports(VACANCY_CHANGE_TYPES, changeSet)
  }

  execute(context: ProjectionContext) {
    return context
  }
}

export const DEFAULT_CHANGE_SET_EXECUTORS = Object.freeze([
  new DepartmentExecutor(),
  new TeamExecutor(),
  new PositionExecutor(),
  new EmployeeExecutor(),
  new VacancyExecutor(),
])

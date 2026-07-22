import type { ChangeSet } from "../../types/planning-contracts"
import type { ProjectionContext } from "../context"
import { matchesChangeType, type ChangeSetExecutor } from "./change-set-executor"

export class DepartmentExecutor implements ChangeSetExecutor {
  readonly name = "DepartmentExecutor"
  canExecute(changeSet: ChangeSet) { return matchesChangeType(changeSet, "department") }
  execute(context: ProjectionContext) { return context }
}

export class TeamExecutor implements ChangeSetExecutor {
  readonly name = "TeamExecutor"
  canExecute(changeSet: ChangeSet) { return matchesChangeType(changeSet, "team") }
  execute(context: ProjectionContext) { return context }
}

export class PositionExecutor implements ChangeSetExecutor {
  readonly name = "PositionExecutor"
  canExecute(changeSet: ChangeSet) { return matchesChangeType(changeSet, "position") }
  execute(context: ProjectionContext) { return context }
}

export class EmployeeExecutor implements ChangeSetExecutor {
  readonly name = "EmployeeExecutor"
  canExecute(changeSet: ChangeSet) { return matchesChangeType(changeSet, "employee") }
  execute(context: ProjectionContext) { return context }
}

export class VacancyExecutor implements ChangeSetExecutor {
  readonly name = "VacancyExecutor"
  canExecute(changeSet: ChangeSet) { return matchesChangeType(changeSet, "vacancy") }
  execute(context: ProjectionContext) { return context }
}

export const DEFAULT_CHANGE_SET_EXECUTORS = Object.freeze([
  new DepartmentExecutor(),
  new TeamExecutor(),
  new PositionExecutor(),
  new EmployeeExecutor(),
  new VacancyExecutor(),
])

import type { ChangeSet } from "../../types/planning-contracts"
import type { ProjectionContext } from "../context"
import {
  archiveProjectedDepartment,
  createProjectedDepartment,
  DEPARTMENT_CHANGE_TYPES,
  isDepartmentChangeType,
  parseDepartmentChangeSet,
  updateProjectedDepartment,
  type DepartmentMutationResult,
  type ParsedDepartmentChangeSet,
} from "../departments"
import {
  createProjectedEmployee,
  EMPLOYEE_CHANGE_TYPES,
  isEmployeeChangeType,
  parseEmployeeChangeSet,
  transferProjectedEmployee,
  updateProjectedEmployee,
  type EmployeeMutationResult,
  type ParsedEmployeeChangeSet,
} from "../employees"
import {
  archiveProjectedPosition,
  createProjectedPosition,
  isPositionChangeType,
  moveProjectedPosition,
  parsePositionChangeSet,
  POSITION_CHANGE_TYPES,
  updateProjectedPosition,
  type ParsedPositionChangeSet,
  type PositionMutationResult,
} from "../positions"
import {
  archiveProjectedTeam,
  createProjectedTeam,
  updateProjectedTeam,
  type TeamMutationResult,
} from "../teams/projected-team-operations"
import {
  isTeamChangeType,
  parseTeamChangeSet,
  TEAM_CHANGE_TYPES,
  type ParsedTeamChangeSet,
} from "../teams/team-change-set"
import type { ChangeSetExecutor } from "./change-set-executor"

const VACANCY_CHANGE_TYPES = [
  "vacancy.create",
  "vacancy.update",
  "vacancy.close",
] as const

function supports(
  supportedChangeTypes: readonly string[],
  changeSet: ChangeSet
) {
  return supportedChangeTypes.includes(
    changeSet.changeType
  )
}

export class DepartmentExecutor
  implements ChangeSetExecutor
{
  readonly name = "DepartmentExecutor"

  canExecute(changeSet: ChangeSet) {
    return isDepartmentChangeType(
      changeSet.changeType
    )
  }

  execute(
    context: ProjectionContext,
    changeSet: ChangeSet
  ) {
    const parsed =
      parseDepartmentChangeSet(changeSet)

    if (!parsed.success) {
      return context.addError(parsed.issue)
    }

    const result = executeDepartmentMutation(
      context,
      parsed.changeSet
    )

    if (!result.success) {
      return context.addError(result.issue)
    }

    let nextContext = context

    if (
      result.departments !==
      context.organization.departments
    ) {
      nextContext = nextContext.withOrganization({
        ...context.organization,
        departments: result.departments,
      })
    }

    if (result.event) {
      nextContext = nextContext.addEvent(
        result.event
      )
    }

    if (result.warning) {
      nextContext = nextContext.addWarning(
        result.warning
      )
    }

    return nextContext
  }
}

export class TeamExecutor
  implements ChangeSetExecutor
{
  readonly name = "TeamExecutor"

  canExecute(changeSet: ChangeSet) {
    return isTeamChangeType(
      changeSet.changeType
    )
  }

  execute(
    context: ProjectionContext,
    changeSet: ChangeSet
  ) {
    const parsed =
      parseTeamChangeSet(changeSet)

    if (!parsed.success) {
      return context.addError(parsed.issue)
    }

    const result = executeTeamMutation(
      context,
      parsed.changeSet
    )

    if (!result.success) {
      return context.addError(result.issue)
    }

    let nextContext = context

    if (
      result.teams !==
      context.organization.teams
    ) {
      nextContext = nextContext.withOrganization({
        ...context.organization,
        teams: result.teams,
      })
    }

    if (result.event) {
      nextContext = nextContext.addEvent(
        result.event
      )
    }

    if (result.warning) {
      nextContext = nextContext.addWarning(
        result.warning
      )
    }

    return nextContext
  }
}

export class PositionExecutor
  implements ChangeSetExecutor
{
  readonly name = "PositionExecutor"

  canExecute(changeSet: ChangeSet) {
    return isPositionChangeType(
      changeSet.changeType
    )
  }

  execute(
    context: ProjectionContext,
    changeSet: ChangeSet
  ) {
    const parsed =
      parsePositionChangeSet(changeSet)

    if (!parsed.success) {
      return context.addError(parsed.issue)
    }

    const result = executePositionMutation(
      context,
      parsed.changeSet
    )

    if (!result.success) {
      return context.addError(result.issue)
    }

    let nextContext = context

    if (
      result.positions !==
      context.organization.positions
    ) {
      nextContext = nextContext.withOrganization({
        ...context.organization,
        positions: result.positions,
      })
    }

    if (result.event) {
      nextContext = nextContext.addEvent(
        result.event
      )
    }

    if (result.warning) {
      nextContext = nextContext.addWarning(
        result.warning
      )
    }

    return nextContext
  }
}

export class EmployeeExecutor
  implements ChangeSetExecutor
{
  readonly name = "EmployeeExecutor"

  canExecute(changeSet: ChangeSet) {
    return isEmployeeChangeType(
      changeSet.changeType
    )
  }

  execute(
    context: ProjectionContext,
    changeSet: ChangeSet
  ) {
    const parsed =
      parseEmployeeChangeSet(changeSet)

    if (!parsed.success) {
      return context.addError(parsed.issue)
    }

    const result = executeEmployeeMutation(
      context,
      parsed.changeSet
    )

    if (!result.success) {
      return context.addError(result.issue)
    }

    let nextContext = context

    if (
      result.employees !==
      context.organization.employees
    ) {
      nextContext = nextContext.withOrganization({
        ...context.organization,
        employees: result.employees,
      })
    }

    if (result.warning) {
      nextContext = nextContext.addWarning(
        result.warning
      )
    }

    return nextContext
  }
}

export class VacancyExecutor
  implements ChangeSetExecutor
{
  readonly name = "VacancyExecutor"

  canExecute(changeSet: ChangeSet) {
    return supports(
      VACANCY_CHANGE_TYPES,
      changeSet
    )
  }

  execute(context: ProjectionContext) {
    return context
  }
}

export const DEFAULT_CHANGE_SET_EXECUTORS =
  Object.freeze([
    new DepartmentExecutor(),
    new TeamExecutor(),
    new PositionExecutor(),
    new EmployeeExecutor(),
    new VacancyExecutor(),
  ])

function executeDepartmentMutation(
  context: ProjectionContext,
  changeSet: ParsedDepartmentChangeSet
): DepartmentMutationResult {
  switch (changeSet.changeType) {
    case "department.create":
      return createProjectedDepartment(
        context.organization.departments,
        changeSet.id,
        changeSet.payload
      )

    case "department.update":
      return updateProjectedDepartment(
        context.organization.departments,
        changeSet.id,
        changeSet.payload
      )

    case "department.archive":
      return archiveProjectedDepartment(
        context.organization.departments,
        context.organization.teams,
        context.organization.positions,
        changeSet.id,
        changeSet.payload
      )
  }
}

function executeEmployeeMutation(
  context: ProjectionContext,
  changeSet: ParsedEmployeeChangeSet
): EmployeeMutationResult {
  switch (changeSet.changeType) {
    case "employee.create":
      return createProjectedEmployee(
        context.organization.employees,
        context.organization.positions,
        changeSet.id,
        changeSet.payload
      )

    case "employee.update":
      return updateProjectedEmployee(
        context.organization.employees,
        context.organization.positions,
        changeSet.id,
        changeSet.payload
      )

    case "employee.transfer":
      return transferProjectedEmployee(
        context.organization.employees,
        context.organization.positions,
        changeSet.id,
        changeSet.payload
      )
  }
}

function executeTeamMutation(
  context: ProjectionContext,
  changeSet: ParsedTeamChangeSet
): TeamMutationResult {
  switch (changeSet.changeType) {
    case "team.create":
      return createProjectedTeam(
        context.organization.teams,
        context.organization.departments,
        changeSet.id,
        changeSet.payload
      )

    case "team.update":
      return updateProjectedTeam(
        context.organization.teams,
        context.organization.departments,
        changeSet.id,
        changeSet.payload
      )

    case "team.archive":
      return archiveProjectedTeam(
        context.organization.teams,
        changeSet.id,
        changeSet.payload
      )
  }
}

function executePositionMutation(
  context: ProjectionContext,
  changeSet: ParsedPositionChangeSet
): PositionMutationResult {
  switch (changeSet.changeType) {
    case "position.create":
      return createProjectedPosition(
        context.organization.positions,
        context.organization.departments,
        changeSet.id,
        changeSet.payload
      )

    case "position.update":
      return updateProjectedPosition(
        context.organization.positions,
        changeSet.id,
        changeSet.payload
      )

    case "position.archive":
      return archiveProjectedPosition(
        context.organization.positions,
        context.organization.employees,
        changeSet.id,
        changeSet.payload
      )

    case "position.move":
      return moveProjectedPosition(
        context.organization.positions,
        context.organization.departments,
        changeSet.id,
        changeSet.payload
      )
  }
}

export {
  DEPARTMENT_CHANGE_TYPES,
  EMPLOYEE_CHANGE_TYPES,
  POSITION_CHANGE_TYPES,
  TEAM_CHANGE_TYPES,
}

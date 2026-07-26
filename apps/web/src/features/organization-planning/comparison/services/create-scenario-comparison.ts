import type {
  PlanningChangeSet,
} from "../../change-sets/types/planning-change-set"

import type {
  ScenarioComparison,
} from "../types/scenario-comparison"


function createEmptySummary() {
  return {
    departmentsCreated: 0,
    departmentsUpdated: 0,
    departmentsArchived: 0,

    teamsCreated: 0,
    teamsUpdated: 0,
    teamsArchived: 0,

    positionsCreated: 0,
    positionsUpdated: 0,
    positionsMoved: 0,
    positionsArchived: 0,

    employeesCreated: 0,
    employeesUpdated: 0,
    employeesMoved: 0,
    employeesTerminated: 0,
    employeesArchived: 0,
  }
}


export function createScenarioComparison(
  scenarioId: string,
  changeSets: readonly PlanningChangeSet[]
): ScenarioComparison {
  const summary = createEmptySummary()

  for (const changeSet of changeSets) {
    switch (changeSet.changeType) {
      case "department.create":
        summary.departmentsCreated++
        break

      case "department.update":
        summary.departmentsUpdated++
        break

      case "department.archive":
        summary.departmentsArchived++
        break


      case "team.create":
        summary.teamsCreated++
        break

      case "team.update":
        summary.teamsUpdated++
        break

      case "team.archive":
        summary.teamsArchived++
        break


      case "position.create":
        summary.positionsCreated++
        break

      case "position.update":
        summary.positionsUpdated++
        break

      case "position.move":
        summary.positionsMoved++
        break

      case "position.archive":
        summary.positionsArchived++
        break


      case "employee.create":
        summary.employeesCreated++
        break

      case "employee.update":
        summary.employeesUpdated++
        break

      case "employee.move":
        summary.employeesMoved++
        break

      case "employee.terminate":
        summary.employeesTerminated++
        break

      case "employee.archive":
        summary.employeesArchived++
        break
    }
  }

  return {
    scenarioId,
    summary,
  }
}

import type { ProjectionInternalEvent } from "../../projection"
import type { PlanningKPIProvider, PlanningKPISource } from "../contracts"
import { PLANNING_KPI_KEYS, result } from "./provider-support"

export class ScenarioProvider implements PlanningKPIProvider {
  readonly keys = Object.freeze([
    PLANNING_KPI_KEYS.scenarioImpact,
    PLANNING_KPI_KEYS.createdPositions, PLANNING_KPI_KEYS.archivedPositions,
    PLANNING_KPI_KEYS.createdTeams, PLANNING_KPI_KEYS.archivedTeams,
    PLANNING_KPI_KEYS.createdDepartments, PLANNING_KPI_KEYS.archivedDepartments,
  ])

  calculate(source: PlanningKPISource) {
    const events = source.scenario.events
    const counts = this.keys.slice(1).map((key) => count(events, eventTypeByKey(key)))
    const impact = counts[0] - counts[1] + counts[2] - counts[3] + counts[4] - counts[5]
    return Object.freeze([result(this.keys[0], impact), ...counts.map((value, index) =>
      result(this.keys[index + 1], value))])
  }
}

function count(events: readonly ProjectionInternalEvent[], type: ProjectionInternalEvent["type"]): number {
  return events.filter((event) => event.type === type).length
}

function eventTypeByKey(key: string): ProjectionInternalEvent["type"] {
  const types: Readonly<Record<string, ProjectionInternalEvent["type"]>> = {
    [PLANNING_KPI_KEYS.createdPositions]: "position.created",
    [PLANNING_KPI_KEYS.archivedPositions]: "position.archived",
    [PLANNING_KPI_KEYS.createdTeams]: "team.created",
    [PLANNING_KPI_KEYS.archivedTeams]: "team.archived",
    [PLANNING_KPI_KEYS.createdDepartments]: "department.created",
    [PLANNING_KPI_KEYS.archivedDepartments]: "department.archived",
  }
  return types[key] ?? "change-set.unhandled"
}

import type { PlanningChangeSet } from "../../change-sets"

import {
  getChangeSetPresentation,
} from "./change-set-description"

export type ChangeSetStats = Readonly<{
  total: number
  departments: number
  teams: number
  positions: number
  employees: number
  unknown: number
}>

export function getChangeSetStats(
  changeSets: readonly PlanningChangeSet[]
): ChangeSetStats {
  const stats = {
    total: changeSets.length,
    departments: 0,
    teams: 0,
    positions: 0,
    employees: 0,
    unknown: 0,
  }

  for (const changeSet of changeSets) {
    const presentation =
      getChangeSetPresentation(changeSet)

    switch (presentation.entity) {
      case "department":
        stats.departments += 1
        break

      case "team":
        stats.teams += 1
        break

      case "position":
        stats.positions += 1
        break

      case "employee":
        stats.employees += 1
        break

      default:
        stats.unknown += 1
        break
    }
  }

  return Object.freeze(stats)
}

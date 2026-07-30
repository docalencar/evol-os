import type { PlanningKPIProvider, PlanningKPISource } from "../contracts"
import { activeCount, PLANNING_KPI_KEYS, result } from "./provider-support"

export class VacancyProvider implements PlanningKPIProvider {
  readonly keys = Object.freeze([
    PLANNING_KPI_KEYS.vacancies,
    PLANNING_KPI_KEYS.occupiedPositions,
    PLANNING_KPI_KEYS.occupancyRate,
  ])

  calculate(source: PlanningKPISource) {
    const positions = activeCount(source.planned.positions)
    const occupied = new Set(source.planned.employees
      .filter((employee) => employee.status !== "archived" && employee.positionId)
      .map((employee) => employee.positionId)).size
    const vacancies = activeCount(source.planned.vacancies)
    return Object.freeze([
      result(this.keys[0], vacancies),
      result(this.keys[1], occupied),
      result(this.keys[2], positions === 0 ? 0 : occupied / positions),
    ])
  }
}

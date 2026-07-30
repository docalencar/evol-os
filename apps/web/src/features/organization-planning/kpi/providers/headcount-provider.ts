import type { PlanningKPIProvider, PlanningKPISource } from "../contracts"
import { activeCount, PLANNING_KPI_KEYS, result } from "./provider-support"

export class HeadcountProvider implements PlanningKPIProvider {
  readonly keys = Object.freeze([
    PLANNING_KPI_KEYS.headcount,
    PLANNING_KPI_KEYS.approvedHeadcount,
    PLANNING_KPI_KEYS.plannedHeadcount,
  ])

  calculate(source: PlanningKPISource) {
    return Object.freeze([
      result(this.keys[0], activeCount(source.current.employees)),
      result(this.keys[1], activeCount(source.current.positions)),
      result(this.keys[2], activeCount(source.planned.employees)),
    ])
  }
}

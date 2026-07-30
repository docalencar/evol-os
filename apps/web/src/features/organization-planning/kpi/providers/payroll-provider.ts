import type { PlanningKPIProvider, PlanningKPISource } from "../contracts"
import { PLANNING_KPI_KEYS, result } from "./provider-support"

export class PayrollProvider implements PlanningKPIProvider {
  readonly keys = Object.freeze([
    PLANNING_KPI_KEYS.currentPayroll,
    PLANNING_KPI_KEYS.plannedPayroll,
    PLANNING_KPI_KEYS.payrollVariation,
  ])

  calculate(source: PlanningKPISource) {
    const current = source.current.metrics.salaryMass
    const planned = source.planned.metrics.salaryMass
    return Object.freeze([
      result(this.keys[0], current),
      result(this.keys[1], planned),
      result(this.keys[2], current === 0 ? 0 : (planned - current) / current),
    ])
  }
}

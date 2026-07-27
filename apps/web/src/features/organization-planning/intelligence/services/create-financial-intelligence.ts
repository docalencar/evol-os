import type {
  ProjectionMetrics,
} from "../../projection"
import type {
  FinancialIntelligence,
} from "../types"
import {
  createMetricDelta,
} from "./create-metric-delta"

export function createFinancialIntelligence(
  current:
    ProjectionMetrics,
  projected:
    ProjectionMetrics
): FinancialIntelligence {
  return Object.freeze({
    salaryMass:
      createMetricDelta(
        current.salaryMass,
        projected.salaryMass
      ),
  })
}

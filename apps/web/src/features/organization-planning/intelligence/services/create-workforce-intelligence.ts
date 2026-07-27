import type {
  ProjectionMetrics,
} from "../../projection"
import type {
  WorkforceIntelligence,
} from "../types"
import {
  createMetricDelta,
} from "./create-metric-delta"

export function createWorkforceIntelligence(
  current:
    ProjectionMetrics,
  projected:
    ProjectionMetrics
): WorkforceIntelligence {
  return Object.freeze({
    headcount:
      createMetricDelta(
        current.headcount,
        projected.headcount
      ),
  })
}

import type {
  ProjectionMetrics,
} from "../../projection"
import type {
  OrganizationIntelligence,
} from "../types"
import {
  createMetricDelta,
} from "./create-metric-delta"

export function createOrganizationIntelligence(
  current:
    ProjectionMetrics,
  projected:
    ProjectionMetrics
): OrganizationIntelligence {
  return Object.freeze({
    departments:
      createMetricDelta(
        current.departments,
        projected.departments
      ),

    positions:
      createMetricDelta(
        current.positions,
        projected.positions
      ),
  })
}

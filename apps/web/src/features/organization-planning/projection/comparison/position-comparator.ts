import type { ProjectedPosition } from "../contracts"
import type { PositionComparison } from "./comparison-contracts"
import { compareStructuralEntities } from "./comparison-support"

const POSITION_COMPARISON_FIELDS = Object.freeze([
  "name",
  "description",
  "departmentId",
  "hierarchicalLevel",
  "weeklyWorkloadHours",
  "workModel",
  "employmentType",
  "travelRequirement",
] as const)

export function comparePositions(
  basePositions: readonly ProjectedPosition[],
  projectedPositions: readonly ProjectedPosition[]
): PositionComparison {
  return compareStructuralEntities(
    basePositions,
    projectedPositions,
    POSITION_COMPARISON_FIELDS
  )
}

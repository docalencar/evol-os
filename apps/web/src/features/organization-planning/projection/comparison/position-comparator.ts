import type { ProjectedPosition } from "../contracts"
import type { PositionComparison } from "./comparison-contracts"
import { compareStructural } from "./structural-comparator"

const fields = Object.freeze(["name", "description", "departmentId", "hierarchicalLevel", "weeklyWorkloadHours", "workModel", "employmentType", "travelRequirement"] as const)
export function comparePositions(before: readonly ProjectedPosition[], after: readonly ProjectedPosition[]): PositionComparison {
  return compareStructural(before, after, fields, "positions")
}

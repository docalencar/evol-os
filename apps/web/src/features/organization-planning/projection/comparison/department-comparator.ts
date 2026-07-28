import type { ProjectedDepartment } from "../contracts"
import type { DepartmentComparison } from "./comparison-contracts"
import { compareStructuralEntities } from "./comparison-support"

const DEPARTMENT_COMPARISON_FIELDS = Object.freeze([
  "name",
  "code",
  "description",
  "parentDepartmentId",
] as const)

export function compareDepartments(
  baseDepartments: readonly ProjectedDepartment[],
  projectedDepartments: readonly ProjectedDepartment[]
): DepartmentComparison {
  return compareStructuralEntities(
    baseDepartments,
    projectedDepartments,
    DEPARTMENT_COMPARISON_FIELDS
  )
}

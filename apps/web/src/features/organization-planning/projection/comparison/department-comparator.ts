import type { ProjectedDepartment } from "../contracts"
import type { DepartmentComparison } from "./comparison-contracts"
import { compareStructural } from "./structural-comparator"

const fields = Object.freeze(["name", "code", "description", "parentDepartmentId"] as const)
export function compareDepartments(before: readonly ProjectedDepartment[], after: readonly ProjectedDepartment[]): DepartmentComparison {
  return compareStructural(before, after, fields, "departments")
}

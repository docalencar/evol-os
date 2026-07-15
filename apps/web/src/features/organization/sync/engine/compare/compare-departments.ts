import type {
  DepartmentSnapshot,
} from "../../types/organization-snapshot"

export type DepartmentComparisonOperation =
  | "create"
  | "unchanged"
  | "missing"

export type DepartmentComparisonItem = {
  name: string

  operation: DepartmentComparisonOperation
}

export function compareDepartments(
  current: DepartmentSnapshot[],
  desired: DepartmentSnapshot[]
): DepartmentComparisonItem[] {
  const currentNames = new Set(
    current.map((department) =>
      department.name.trim().toLowerCase()
    )
  )

  const desiredNames = new Set(
    desired.map((department) =>
      department.name.trim().toLowerCase()
    )
  )

  const result: DepartmentComparisonItem[] = []

  for (const department of desired) {
    const normalized =
      department.name.trim().toLowerCase()

    result.push({
      name: department.name,
      operation: currentNames.has(normalized)
        ? "unchanged"
        : "create",
    })
  }

  for (const department of current) {
    const normalized =
      department.name.trim().toLowerCase()

    if (!desiredNames.has(normalized)) {
      result.push({
        name: department.name,
        operation: "missing",
      })
    }
  }

  return result.sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}

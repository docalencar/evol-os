import {
  resolveEmployeeIdentity,
} from "../identity"

import type {
  EmployeeSnapshot,
} from "../../types/organization-snapshot"

export type EmployeeComparisonOperation =
  | "create"
  | "unchanged"
  | "missing"

export type EmployeeComparisonItem = {
  employee: EmployeeSnapshot

  operation: EmployeeComparisonOperation

  matchedBy?:
    | "evol-id"
    | "employee-code"
    | "cpf"
    | "name"
}

export function compareEmployees(
  current: EmployeeSnapshot[],
  desired: EmployeeSnapshot[]
): EmployeeComparisonItem[] {
  const result: EmployeeComparisonItem[] = []

  const matchedCurrent = new Set<string>()

  for (const employee of desired) {
    const identity = resolveEmployeeIdentity(
      employee,
      current
    )

    if (!identity.found) {
      result.push({
        employee,
        operation: "create",
      })

      continue
    }

    matchedCurrent.add(identity.employee.fullName)

    result.push({
      employee,
      operation: "unchanged",
      matchedBy: identity.strategy,
    })
  }

  for (const employee of current) {
    if (!matchedCurrent.has(employee.fullName)) {
      result.push({
        employee,
        operation: "missing",
      })
    }
  }

  return result.sort((a, b) =>
    a.employee.fullName.localeCompare(
      b.employee.fullName
    )
  )
}

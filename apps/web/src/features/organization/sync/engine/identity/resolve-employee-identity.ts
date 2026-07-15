import type {
  EmployeeSnapshot,
} from "../../types/organization-snapshot"

export type EmployeeIdentityMatch =
  | {
      found: true
      employee: EmployeeSnapshot
      strategy:
        | "evol-id"
        | "employee-code"
        | "cpf"
        | "name"
    }
  | {
      found: false
    }

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

export function resolveEmployeeIdentity(
  employee: EmployeeSnapshot,
  employees: EmployeeSnapshot[]
): EmployeeIdentityMatch {
  if (employee.evolId) {
    const match = employees.find(
      (item) => item.evolId === employee.evolId
    )

    if (match) {
      return {
        found: true,
        employee: match,
        strategy: "evol-id",
      }
    }
  }

  if (employee.employeeCode) {
    const match = employees.find(
      (item) =>
        item.employeeCode === employee.employeeCode
    )

    if (match) {
      return {
        found: true,
        employee: match,
        strategy: "employee-code",
      }
    }
  }

  if (employee.cpf) {
    const match = employees.find(
      (item) => item.cpf === employee.cpf
    )

    if (match) {
      return {
        found: true,
        employee: match,
        strategy: "cpf",
      }
    }
  }

  const normalizedName = normalize(
    employee.fullName
  )

  const match = employees.find(
    (item) =>
      normalize(item.fullName) === normalizedName
  )

  if (match) {
    return {
      found: true,
      employee: match,
      strategy: "name",
    }
  }

  return {
    found: false,
  }
}

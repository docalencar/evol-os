import {
  compareDepartments,
  compareEmployees,
  comparePositions,
  compareTeams,
} from "../compare"

import type {
  OrganizationSnapshot,
} from "../../types/organization-snapshot"
import type {
  OrganizationSyncItem,
} from "../../types/organization-sync-item"
import type {
  OrganizationSyncPlan,
} from "../../types/organization-sync-plan"

function createItemId(
  entity: OrganizationSyncItem["entity"],
  name: string,
  operation: OrganizationSyncItem["operation"]
) {
  const normalizedName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return `${entity}:${operation}:${normalizedName}`
}

function mapOperation(
  operation: "create" | "unchanged" | "missing"
): OrganizationSyncItem["operation"] {
  if (operation === "missing") {
    return "archive"
  }

  return operation
}

function mapSeverity(
  operation: "create" | "unchanged" | "missing"
): OrganizationSyncItem["severity"] {
  return operation === "missing" ? "warning" : "info"
}

function createDepartmentItems(
  current: OrganizationSnapshot,
  desired: OrganizationSnapshot
): OrganizationSyncItem[] {
  return compareDepartments(
    current.departments,
    desired.departments
  ).map((department) => {
    const operation = mapOperation(department.operation)

    return {
      id: createItemId("department", department.name, operation),
      entity: "department",
      operation,
      severity: mapSeverity(department.operation),
      title: department.name,
      description:
        department.operation === "create"
          ? "Novo departamento identificado."
          : department.operation === "missing"
            ? "Departamento ausente na origem. Exige revisão antes de arquivar."
            : "Departamento sem alterações.",
      current:
        department.operation === "create"
          ? null
          : { name: department.name },
      desired:
        department.operation === "missing"
          ? null
          : { name: department.name },
    }
  })
}

function createTeamItems(
  current: OrganizationSnapshot,
  desired: OrganizationSnapshot
): OrganizationSyncItem[] {
  return compareTeams(
    current.teams,
    desired.teams
  ).map((team) => {
    const operation = mapOperation(team.operation)

    return {
      id: createItemId("team", team.name, operation),
      entity: "team",
      operation,
      severity: mapSeverity(team.operation),
      title: team.name,
      description:
        team.operation === "create"
          ? "Novo time identificado."
          : team.operation === "missing"
            ? "Time ausente na origem. Exige revisão antes de arquivar."
            : "Time sem alterações.",
      current:
        team.operation === "create"
          ? null
          : {
              name: team.name,
              department: team.department,
            },
      desired:
        team.operation === "missing"
          ? null
          : {
              name: team.name,
              department: team.department,
            },
    }
  })
}

function createPositionItems(
  current: OrganizationSnapshot,
  desired: OrganizationSnapshot
): OrganizationSyncItem[] {
  return comparePositions(
    current.positions,
    desired.positions
  ).map((position) => {
    const operation = mapOperation(position.operation)

    return {
      id: createItemId("position", position.name, operation),
      entity: "position",
      operation,
      severity: mapSeverity(position.operation),
      title: position.name,
      description:
        position.operation === "create"
          ? "Novo cargo identificado."
          : position.operation === "missing"
            ? "Cargo ausente na origem. Exige revisão antes de arquivar."
            : "Cargo sem alterações.",
      current:
        position.operation === "create"
          ? null
          : {
              name: position.name,
              department: position.department,
            },
      desired:
        position.operation === "missing"
          ? null
          : {
              name: position.name,
              department: position.department,
            },
    }
  })
}

function createEmployeeItems(
  current: OrganizationSnapshot,
  desired: OrganizationSnapshot
): OrganizationSyncItem[] {
  return compareEmployees(
    current.employees,
    desired.employees
  ).map((comparison) => {
    const operation = mapOperation(comparison.operation)
    const employee = comparison.employee

    return {
      id: createItemId("employee", employee.fullName, operation),
      entity: "employee",
      operation,
      severity: mapSeverity(comparison.operation),
      title: employee.fullName,
      description:
        comparison.operation === "create"
          ? "Novo colaborador identificado."
          : comparison.operation === "missing"
            ? "Colaborador ausente na origem. Exige revisão antes de qualquer desligamento."
            : `Colaborador localizado por ${comparison.matchedBy ?? "identidade"}.`,
      current:
        comparison.operation === "create"
          ? null
          : employee,
      desired:
        comparison.operation === "missing"
          ? null
          : employee,
    }
  })
}

export function createOrganizationSyncPlan(
  current: OrganizationSnapshot,
  desired: OrganizationSnapshot
): OrganizationSyncPlan {
  const items = [
    ...createDepartmentItems(current, desired),
    ...createTeamItems(current, desired),
    ...createPositionItems(current, desired),
    ...createEmployeeItems(current, desired),
  ]

  return {
    generatedAt: new Date(),
    summary: {
      creates: items.filter(
        (item) => item.operation === "create"
      ).length,
      updates: items.filter(
        (item) => item.operation === "update"
      ).length,
      moves: items.filter(
        (item) => item.operation === "move"
      ).length,
      archives: items.filter(
        (item) => item.operation === "archive"
      ).length,
      restores: items.filter(
        (item) => item.operation === "restore"
      ).length,
      unchanged: items.filter(
        (item) => item.operation === "unchanged"
      ).length,
      conflicts: items.filter(
        (item) => item.operation === "conflict"
      ).length,
    },
    items,
  }
}

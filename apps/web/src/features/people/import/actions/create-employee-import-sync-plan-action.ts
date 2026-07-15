"use server"

import {
  createOrganizationSyncPlan,
  type DepartmentSnapshot,
  type EmployeeSnapshot,
  type OrganizationSnapshot,
  type OrganizationSyncPlan,
  type PositionSnapshot,
  type TeamSnapshot,
} from "@/features/organization/sync"
import {
  getDepartments,
} from "@/features/organization/departments"
import {
  getPositions,
} from "@/features/organization/positions"
import {
  getTeams,
} from "@/features/organization/teams"
import {
  getEmployees,
} from "@/features/people"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import type {
  EmployeeImportActionRow,
} from "../types/employee-import-action"

type SerializedOrganizationSyncPlan = Omit<
  OrganizationSyncPlan,
  "generatedAt"
> & {
  generatedAt: string
}

export type EmployeeImportSyncPlanResult =
  | {
      success: true
      message: string
      plan: SerializedOrganizationSyncPlan
    }
  | {
      success: false
      message: string
      plan: null
    }

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function createPositionKey(
  name: string,
  department?: string
) {
  return `${normalize(name)}::${normalize(department)}`
}

function createCurrentSnapshot(
  departments: Array<{
    id: string
    name: string
  }>,
  teams: Array<{
    id: string
    name: string
    department_id?: string | null
  }>,
  positions: Array<{
    id: string
    name: string
    department_id?: string | null
  }>,
  employees: Array<{
    id: string
    full_name: string
    email: string | null
    team_id: string | null
    position_id: string | null
    manager_id: string | null
  }>
): OrganizationSnapshot {
  const departmentNameById = new Map(
    departments.map((department) => [
      department.id,
      department.name,
    ])
  )

  const teamNameById = new Map(
    teams.map((team) => [
      team.id,
      team.name,
    ])
  )

  const positionById = new Map(
    positions.map((position) => [
      position.id,
      position,
    ])
  )

  const employeeNameById = new Map(
    employees.map((employee) => [
      employee.id,
      employee.full_name,
    ])
  )

  return {
    departments: departments.map<DepartmentSnapshot>(
      (department) => ({
        name: department.name,
      })
    ),

    teams: teams.map<TeamSnapshot>((team) => ({
      name: team.name,
      department: team.department_id
        ? departmentNameById.get(team.department_id)
        : undefined,
    })),

    positions: positions.map<PositionSnapshot>(
      (position) => ({
        name: position.name,
        department: position.department_id
          ? departmentNameById.get(position.department_id)
          : undefined,
      })
    ),

    employees: employees.map<EmployeeSnapshot>(
      (employee) => {
        const position = employee.position_id
          ? positionById.get(employee.position_id)
          : undefined

        return {
          evolId: employee.id,
          fullName: employee.full_name,
          email: employee.email ?? undefined,
          department: position?.department_id
            ? departmentNameById.get(
                position.department_id
              )
            : undefined,
          team: employee.team_id
            ? teamNameById.get(employee.team_id)
            : undefined,
          position: position?.name,
          manager: employee.manager_id
            ? employeeNameById.get(employee.manager_id)
            : undefined,
        }
      }
    ),
  }
}

function createDesiredSnapshot(
  current: OrganizationSnapshot,
  rows: EmployeeImportActionRow[]
): OrganizationSnapshot {
  const departments = [...current.departments]
  const positions = [...current.positions]
  const employees = [...current.employees]

  const departmentNames = new Set(
    departments.map((department) =>
      normalize(department.name)
    )
  )

  const positionKeys = new Set(
    positions.map((position) =>
      createPositionKey(
        position.name,
        position.department
      )
    )
  )

  const employeeNames = new Set(
    employees.map((employee) =>
      normalize(employee.fullName)
    )
  )

  for (const row of rows) {
    const fullName =
      row.values.fullName?.trim() ?? ""

    const department =
      row.values.department?.trim() ?? ""

    const position =
      row.values.position?.trim() ?? ""

    if (
      department &&
      !departmentNames.has(normalize(department))
    ) {
      departments.push({
        name: department,
      })

      departmentNames.add(normalize(department))
    }

    if (position) {
      const key = createPositionKey(
        position,
        department
      )

      if (!positionKeys.has(key)) {
        positions.push({
          name: position,
          department: department || undefined,
        })

        positionKeys.add(key)
      }
    }

    if (
      fullName &&
      !employeeNames.has(normalize(fullName))
    ) {
      employees.push({
        fullName,
        email:
          row.values.email?.trim() || undefined,
        department: department || undefined,
        position: position || undefined,
      })

      employeeNames.add(normalize(fullName))
    }
  }

  return {
    departments,
    teams: current.teams,
    positions,
    employees,
  }
}

export async function createEmployeeImportSyncPlanAction(
  rows: EmployeeImportActionRow[]
): Promise<EmployeeImportSyncPlanResult> {
  if (rows.length === 0) {
    return {
      success: false,
      message:
        "Nenhum colaborador válido foi enviado para análise.",
      plan: null,
    }
  }

  const { companyId } =
    await getCurrentCompanyContext()

  const [
    departments,
    teams,
    positions,
    employees,
  ] = await Promise.all([
    getDepartments(companyId),
    getTeams(companyId),
    getPositions(companyId),
    getEmployees(companyId),
  ])

  const current = createCurrentSnapshot(
    departments ?? [],
    teams ?? [],
    positions ?? [],
    employees ?? []
  )

  const desired = createDesiredSnapshot(
    current,
    rows
  )

  const plan = createOrganizationSyncPlan(
    current,
    desired
  )

  return {
    success: true,
    message:
      "Plano de sincronização criado. Revise as mudanças antes de aplicar.",
    plan: {
      ...plan,
      generatedAt: plan.generatedAt.toISOString(),
    },
  }
}

import "server-only"

import { createDepartmentRepository } from "@/features/organization/departments"
import { createPositionRepository } from "@/features/organization/positions"
import { createTeamRepository } from "@/features/organization/teams"
import { createEmployeeRepository } from "@/features/people"
import { z } from "zod"

import type {
  PlanningOperationalOrganization,
  PlanningOperationalOrganizationSource,
} from "../application"

const id = z.string().min(1)
const nullableId = id.nullable()

const departmentRow = z.object({
  id,
  company_id: id,
  name: z.string(),
  code: z.string().nullable(),
  description: z.string().nullable(),
  parent_department_id: nullableId,
})

const teamRow = z.object({
  id,
  company_id: id,
  name: z.string(),
  description: z.string().nullable(),
  department_id: nullableId,
})

const positionRow = z.object({
  id,
  company_id: id,
  name: z.string(),
  description: z.string().nullable(),
  department_id: nullableId,
  hierarchical_level: z.enum([
    "intern", "assistant", "analyst", "specialist", "coordinator",
    "supervisor", "manager", "director", "executive",
  ]),
  weekly_workload_hours: z.number().finite(),
  work_model: z.enum(["on_site", "hybrid", "remote"]),
  employment_type: z.enum([
    "clt", "pj", "intern", "apprentice", "temporary", "outsourced",
    "contractor", "other",
  ]),
  travel_requirement: z.enum(["none", "occasional", "frequent"]),
  status: z.enum(["draft", "active", "inactive", "obsolete"]),
})

const employeeRow = z.object({
  id,
  company_id: id,
  position_id: nullableId,
})

export async function createPlanningOperationalOrganizationSource(): Promise<PlanningOperationalOrganizationSource> {
  const [departments, teams, positions, employees] = await Promise.all([
    createDepartmentRepository(),
    createTeamRepository(),
    createPositionRepository(),
    createEmployeeRepository(),
  ])

  return {
    async loadByCompany(companyId: string) {
      const results = await Promise.all([
        departments.findAllByCompany(companyId),
        teams.findAllByCompany(companyId),
        positions.findAllByCompany(companyId),
        employees.findAllByCompany(companyId),
      ])
      const [departmentRows, teamRows, positionRows, employeeRows] =
        results.map(readOperationalRows)

      return mapOperationalOrganization(
        companyId,
        departmentRows,
        teamRows,
        positionRows,
        employeeRows
      )
    },
  }
}

function readOperationalRows(result: {
  data: unknown
  error: { message: string } | null
}): readonly unknown[] {
  if (result.error) throw new Error(result.error.message)
  if (!Array.isArray(result.data)) {
    throw new Error("PLANNING_OPERATIONAL_ORGANIZATION_INVALID_DATA")
  }
  return result.data
}

function mapOperationalOrganization(
  companyId: string,
  departmentRows: readonly unknown[],
  teamRows: readonly unknown[],
  positionRows: readonly unknown[],
  employeeRows: readonly unknown[]
): PlanningOperationalOrganization {
  const departments = departmentRows.map((row) => {
    const value = parseRow(departmentRow, row, companyId)
    return Object.freeze({
      id: value.id,
      name: value.name,
      code: value.code,
      description: value.description,
      parentDepartmentId: value.parent_department_id,
    })
  })
  const teams = teamRows.map((row) => {
    const value = parseRow(teamRow, row, companyId)
    return Object.freeze({
      id: value.id,
      name: value.name,
      code: null,
      description: value.description,
      departmentId: value.department_id,
    })
  })
  const positions = positionRows.map((row) => {
    const value = parseRow(positionRow, row, companyId)
    return Object.freeze({
      id: value.id,
      name: value.name,
      description: value.description,
      departmentId: value.department_id,
      hierarchicalLevel: value.hierarchical_level,
      weeklyWorkloadHours: value.weekly_workload_hours,
      workModel: value.work_model,
      employmentType: value.employment_type,
      travelRequirement: value.travel_requirement,
      active: value.status === "active",
    })
  })
  const employees = employeeRows.map((row) => {
    const value = parseRow(employeeRow, row, companyId)
    return Object.freeze({
      id: value.id,
      positionId: value.position_id,
    })
  })

  return Object.freeze({
    departments: Object.freeze(departments),
    teams: Object.freeze(teams),
    positions: Object.freeze(positions),
    employees: Object.freeze(employees),
  })
}

function parseRow<TSchema extends z.ZodType<{ company_id: string }>>(
  schema: TSchema,
  row: unknown,
  companyId: string
): z.output<TSchema> {
  const result = schema.safeParse(row)

  if (!result.success || result.data.company_id !== companyId) {
    throw new Error("PLANNING_OPERATIONAL_ORGANIZATION_INVALID_DATA", {
      cause: result.success ? undefined : result.error,
    })
  }

  return result.data
}

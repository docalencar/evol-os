import "server-only"

import { createDepartmentRepository } from "@/features/organization/departments/repositories/department-repository"
import { createPositionRepository } from "@/features/organization/positions/repositories/position-repository"
import { createTeamRepository } from "@/features/organization/teams/repositories/team-repository"
import { createEmployeeRepository } from "@/features/people/repositories/employee-repository"

import type {
  OrganizationDepartmentReadRow,
  OrganizationEmployeeReadRow,
  OrganizationPositionReadRow,
  OrganizationReadModel,
  OrganizationTeamReadRow,
} from "./organization-read-model"

function createReadError(
  entity: string,
  message: string
) {
  return new Error(
    `Não foi possível carregar ${entity} para o snapshot: ${message}`
  )
}

export async function createOrganizationReadService() {
  const [
    departmentRepository,
    teamRepository,
    positionRepository,
    employeeRepository,
  ] = await Promise.all([
    createDepartmentRepository(),
    createTeamRepository(),
    createPositionRepository(),
    createEmployeeRepository(),
  ])

  return {
    async read(companyId: string): Promise<OrganizationReadModel> {
      const [
        departmentResult,
        teamResult,
        positionResult,
        employeeResult,
      ] = await Promise.all([
        departmentRepository.findAllByCompany(companyId),
        teamRepository.findAllByCompany(companyId),
        positionRepository.findAllByCompany(companyId),
        employeeRepository.findAllByCompany(companyId),
      ])

      if (departmentResult.error) {
        throw createReadError(
          "os departamentos",
          departmentResult.error.message
        )
      }

      if (teamResult.error) {
        throw createReadError(
          "os times",
          teamResult.error.message
        )
      }

      if (positionResult.error) {
        throw createReadError(
          "os cargos",
          positionResult.error.message
        )
      }

      if (employeeResult.error) {
        throw createReadError(
          "os colaboradores",
          employeeResult.error.message
        )
      }

      return Object.freeze({
        departments: Object.freeze(
          (departmentResult.data ??
            []) as OrganizationDepartmentReadRow[]
        ),
        teams: Object.freeze(
          (teamResult.data ??
            []) as OrganizationTeamReadRow[]
        ),
        positions: Object.freeze(
          (positionResult.data ??
            []) as OrganizationPositionReadRow[]
        ),
        employees: Object.freeze(
          (employeeResult.data ??
            []) as OrganizationEmployeeReadRow[]
        ),
      })
    },
  }
}

export type OrganizationReadService = Awaited<
  ReturnType<typeof createOrganizationReadService>
>

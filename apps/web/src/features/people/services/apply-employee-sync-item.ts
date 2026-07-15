import {
  createPositionRepository,
} from "@/features/organization/positions"
import {
  createTeamRepository,
} from "@/features/organization/teams"

import {
  createEmployeeRepository,
} from "../repositories/employee-repository"
import {
  createEmployeeSchema,
} from "../schemas/employee-schema"

import type {
  OrganizationSyncItem,
} from "@/features/organization/sync"

export type ApplyEmployeeSyncItemInput = {
  companyId: string
  item: OrganizationSyncItem
}

export type ApplyEmployeeSyncItemResult = {
  success: boolean
  message: string
  employeeId?: string
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function readDesiredString(
  desired: Record<string, unknown>,
  key: string
) {
  const value = desired[key]

  return typeof value === "string"
    ? value.trim()
    : ""
}

export async function applyEmployeeSyncItem({
  companyId,
  item,
}: ApplyEmployeeSyncItemInput): Promise<ApplyEmployeeSyncItemResult> {
  if (item.entity !== "employee") {
    return {
      success: false,
      message:
        "O item informado não pertence ao domínio de colaboradores.",
    }
  }

  if (item.operation !== "create") {
    return {
      success: false,
      message:
        `A operação "${item.operation}" ainda não é suportada para colaboradores.`,
    }
  }

  if (
    !item.desired ||
    typeof item.desired !== "object"
  ) {
    return {
      success: false,
      message:
        "Os dados desejados do colaborador não foram informados.",
    }
  }

  const desired = item.desired as Record<
    string,
    unknown
  >

  const fullName = readDesiredString(
    desired,
    "fullName"
  )

  const email = readDesiredString(
    desired,
    "email"
  )

  const teamName = readDesiredString(
    desired,
    "team"
  )

  const positionName = readDesiredString(
    desired,
    "position"
  )

  const managerName = readDesiredString(
    desired,
    "manager"
  )

  let teamId = ""
  let positionId = ""
  let managerId = ""

  if (teamName) {
    const teamRepository =
      await createTeamRepository()

    const { data: teams, error } =
      await teamRepository.findAllByCompany(
        companyId
      )

    if (error) {
      return {
        success: false,
        message:
          `Não foi possível localizar o time do colaborador: ${error.message}`,
      }
    }

    teamId =
      teams?.find(
        (team) =>
          normalize(team.name) ===
          normalize(teamName)
      )?.id ?? ""

    if (!teamId) {
      return {
        success: false,
        message:
          `O time "${teamName}" não foi encontrado para "${fullName}".`,
      }
    }
  }

  if (positionName) {
    const positionRepository =
      await createPositionRepository()

    const { data: positions, error } =
      await positionRepository.findAllByCompany(
        companyId
      )

    if (error) {
      return {
        success: false,
        message:
          `Não foi possível localizar o cargo do colaborador: ${error.message}`,
      }
    }

    positionId =
      positions?.find(
        (position) =>
          normalize(position.name) ===
          normalize(positionName)
      )?.id ?? ""

    if (!positionId) {
      return {
        success: false,
        message:
          `O cargo "${positionName}" não foi encontrado para "${fullName}".`,
      }
    }
  }

  if (managerName) {
    const employeeRepository =
      await createEmployeeRepository()

    const { data: employees, error } =
      await employeeRepository.findAllByCompany(
        companyId
      )

    if (error) {
      return {
        success: false,
        message:
          `Não foi possível localizar o gestor do colaborador: ${error.message}`,
      }
    }

    managerId =
      employees?.find(
        (employee) =>
          normalize(employee.full_name) ===
          normalize(managerName)
      )?.id ?? ""

    if (!managerId) {
      return {
        success: false,
        message:
          `O gestor "${managerName}" não foi encontrado para "${fullName}".`,
      }
    }
  }

  const parsedInput = createEmployeeSchema.safeParse({
    fullName,
    email,
    phone: "",
    birthDate: "",
    hireDate: "",
    status: "active",
    teamId,
    positionId,
    managerId,
    discProfile: "",
  })

  if (!parsedInput.success) {
    return {
      success: false,
      message:
        parsedInput.error.issues[0]?.message ??
        "Os dados do novo colaborador são inválidos.",
    }
  }

  const repository =
    await createEmployeeRepository()

  const { data, error } = await repository.create(
    companyId,
    parsedInput.data
  )

  if (error) {
    return {
      success: false,
      message:
        `Não foi possível criar o colaborador: ${error.message}`,
    }
  }

  return {
    success: true,
    message:
      `Colaborador "${data.full_name}" criado com sucesso.`,
    employeeId: data.id,
  }
}

"use server"

import {
  createDepartmentRepository,
} from "../../departments/repositories/department-repository"

export type TeamDepartmentOption = {
  value: string
  label: string
}

type GetTeamDepartmentOptionsActionResult =
  | {
      success: true
      options: TeamDepartmentOption[]
    }
  | {
      success: false
      message: string
      options: TeamDepartmentOption[]
    }

export async function getTeamDepartmentOptionsAction(
  companyId: string
): Promise<GetTeamDepartmentOptionsActionResult> {
  const repository =
    await createDepartmentRepository()

  const {
    data,
    error,
  } = await repository.findAllByCompany(
    companyId
  )

  if (error) {
    console.error(
      "Erro ao carregar departamentos do formulário de time:",
      error
    )

    return {
      success: false,
      message:
        "Não foi possível carregar os departamentos.",
      options: [],
    }
  }

  return {
    success: true,
    options:
      data?.map((department) => ({
        value: department.id,
        label: department.name,
      })) ?? [],
  }
}

"use server"

import { revalidatePath } from "next/cache"

import { createEmployeeCompetencyRepository } from "../repositories/employee-competency-repository"

export async function archiveEmployeeCompetencyAction(
  companyId: string,
  employeeCompetencyId: string
) {
  const repository = await createEmployeeCompetencyRepository()

  const { error } = await repository.archive(
    companyId,
    employeeCompetencyId
  )

  if (error) {
    return {
      success: false,
      message: "Não foi possível arquivar a competência do colaborador.",
    }
  }

  revalidatePath("/app/people")

  return {
    success: true,
    message: "Competência do colaborador arquivada com sucesso.",
  }
}
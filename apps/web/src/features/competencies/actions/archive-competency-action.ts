"use server"

import { revalidatePath } from "next/cache"

import { createCompetencyRepository } from "../repositories/competency-repository"

export async function archiveCompetencyAction(
  companyId: string,
  competencyId: string
) {
  const repository = await createCompetencyRepository()

  const { error } = await repository.archive(
    companyId,
    competencyId
  )

  if (error) {
    return {
      success: false,
      message: "Não foi possível arquivar a competência.",
    }
  }

  revalidatePath("/app/competencies")

  return {
    success: true,
    message: "Competência arquivada com sucesso.",
  }
}

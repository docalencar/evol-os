"use server"

import { revalidatePath } from "next/cache"

import { createPositionCompetencyRepository } from "../repositories/position-competency-repository"

export async function archivePositionCompetencyAction(
  companyId: string,
  positionCompetencyId: string
) {
  const repository = await createPositionCompetencyRepository()

  const { error } = await repository.archive(
    companyId,
    positionCompetencyId
  )

  if (error) {
    return {
      success: false,
      message: "Não foi possível remover a competência do cargo.",
    }
  }

  revalidatePath("/app/company/positions")

  return {
    success: true,
    message: "Competência removida do cargo com sucesso.",
  }
}

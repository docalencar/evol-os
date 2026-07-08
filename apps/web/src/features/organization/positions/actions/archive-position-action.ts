"use server"

import { revalidatePath } from "next/cache"

import { createPositionRepository } from "../repositories/position-repository"

export async function archivePositionAction(companyId: string, positionId: string) {
  const repository = await createPositionRepository()

  const { error } = await repository.archive(companyId, positionId)

  if (error) {
    return {
      success: false,
      message: "Erro ao arquivar cargo.",
    }
  }

  revalidatePath("/app/company/positions")

  return {
    success: true,
    message: "Cargo arquivado com sucesso.",
  }
}

"use server"

import { revalidatePath } from "next/cache"

import { publicSeniorityLevelMessage } from "../errors"
import { createSeniorityLevelRepository } from "../repositories/seniority-level-repository"

export async function archiveSeniorityLevelAction(
  companyId: string,
  seniorityLevelId: string
) {
  const repository = await createSeniorityLevelRepository()
  const { error } = await repository.archive(companyId, seniorityLevelId)

  if (error) {
    return {
      success: false,
      message: publicSeniorityLevelMessage(
        error,
        "Não foi possível arquivar a senioridade."
      ),
    }
  }

  revalidatePath("/app/company/seniority")

  return { success: true, message: "Senioridade arquivada com sucesso." }
}

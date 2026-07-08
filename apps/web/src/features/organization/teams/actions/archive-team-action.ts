"use server"

import { revalidatePath } from "next/cache"

import { createTeamRepository } from "../repositories/team-repository"

export async function archiveTeamAction(companyId: string, teamId: string) {
  const repository = await createTeamRepository()

  const { error } = await repository.archive(companyId, teamId)

  if (error) {
    return {
      success: false,
      message: "Erro ao arquivar time.",
    }
  }

  revalidatePath("/app/company/teams")

  return {
    success: true,
    message: "Time arquivado com sucesso.",
  }
}

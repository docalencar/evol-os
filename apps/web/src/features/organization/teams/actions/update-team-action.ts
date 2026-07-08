"use server"

import { revalidatePath } from "next/cache"

import { createTeamRepository } from "../repositories/team-repository"
import { createTeamSchema } from "../schemas/team-schema"

type UpdateTeamActionState = {
  success: boolean
  message: string
}

export async function updateTeamAction(
  companyId: string,
  teamId: string,
  input: unknown
): Promise<UpdateTeamActionState> {
  const parsedInput = createTeamSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message: "Dados inválidos para atualizar time.",
    }
  }

  const teamRepository = await createTeamRepository()

  const { error } = await teamRepository.update({
    companyId,
    teamId,
    name: parsedInput.data.name,
    description: parsedInput.data.description || null,
    parentTeamId: parsedInput.data.parentTeamId || null,
    leaderId: parsedInput.data.leaderId || null,
  })

  if (error) {
    return {
      success: false,
      message: "Erro ao atualizar time.",
    }
  }

  revalidatePath("/app/company/teams")

  return {
    success: true,
    message: "Time atualizado com sucesso.",
  }
}

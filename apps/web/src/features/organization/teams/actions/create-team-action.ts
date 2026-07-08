"use server"

import { revalidatePath } from "next/cache"

import { createTeamRepository } from "../repositories/team-repository"
import { createTeamSchema } from "../schemas/team-schema"

type CreateTeamActionState = {
  success: boolean
  message: string
}

export async function createTeamAction(
  companyId: string,
  input: unknown
): Promise<CreateTeamActionState> {
  const parsedInput = createTeamSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message: "Dados inválidos para criar time.",
    }
  }

  const teamRepository = await createTeamRepository()

  const { error } = await teamRepository.create({
    companyId,
    name: parsedInput.data.name,
    description: parsedInput.data.description || null,
    parentTeamId: parsedInput.data.parentTeamId || null,
    leaderId: parsedInput.data.leaderId || null,
  })

  if (error) {
    return {
      success: false,
      message: error.message,
    }
  }

  revalidatePath("/app/company/teams")

  return {
    success: true,
    message: "Time criado com sucesso.",
  }
}

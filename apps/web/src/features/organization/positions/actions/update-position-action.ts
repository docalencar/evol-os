"use server"

import { revalidatePath } from "next/cache"

import { createPositionRepository } from "../repositories/position-repository"
import { createPositionSchema } from "../schemas/position-schema"

type UpdatePositionActionState = {
  success: boolean
  message: string
}

export async function updatePositionAction(
  companyId: string,
  positionId: string,
  input: unknown
): Promise<UpdatePositionActionState> {
  const parsedInput = createPositionSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message: "Dados inválidos para atualizar cargo.",
    }
  }

  const repository = await createPositionRepository()

  const { error } = await repository.update({
    companyId,
    positionId,
    name: parsedInput.data.name,
    description: parsedInput.data.description || null,
  })

  if (error) {
    return {
      success: false,
      message: "Erro ao atualizar cargo.",
    }
  }

  revalidatePath("/app/company/positions")

  return {
    success: true,
    message: "Cargo atualizado com sucesso.",
  }
}

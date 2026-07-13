"use server"

import { revalidatePath } from "next/cache"

import { createPositionRepository } from "../repositories/position-repository"
import { createPositionSchema } from "../schemas/position-schema"

type CreatePositionActionState = {
  success: boolean
  message: string
}

export async function createPositionAction(
  companyId: string,
  input: unknown
): Promise<CreatePositionActionState> {
  const parsedInput = createPositionSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message: "Dados inválidos para criar cargo.",
    }
  }

  const repository = await createPositionRepository()

  const { error } = await repository.create({
    companyId,
    name: parsedInput.data.name,
    description: parsedInput.data.description || null,
    departmentId: parsedInput.data.departmentId ?? null,
    hierarchicalLevel: parsedInput.data.hierarchicalLevel,
    status: parsedInput.data.status,
  })

  if (error) {
    return {
      success: false,
      message: error.message,
    }
  }

  revalidatePath("/app/company/positions")

  return {
    success: true,
    message: "Cargo criado com sucesso.",
  }
}
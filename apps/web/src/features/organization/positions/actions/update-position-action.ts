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
    departmentId: parsedInput.data.departmentId ?? null,
    hierarchicalLevel: parsedInput.data.hierarchicalLevel,
    status: parsedInput.data.status,
    weeklyWorkloadHours: parsedInput.data.weeklyWorkloadHours,
    workModel: parsedInput.data.workModel,
    employmentType: parsedInput.data.employmentType,
    travelRequirement: parsedInput.data.travelRequirement,
  })

  if (error) {
    return {
      success: false,
      message: "Erro ao atualizar cargo.",
    }
  }

  revalidatePath("/app/company/positions")
  revalidatePath(`/app/company/positions/${positionId}`)

  return {
    success: true,
    message: "Cargo atualizado com sucesso.",
  }
}
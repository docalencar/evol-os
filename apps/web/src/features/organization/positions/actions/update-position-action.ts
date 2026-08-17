"use server"

import { revalidatePath } from "next/cache"

import {
  updatePosition,
  PeopleOrganizationMutationError,
} from "@/features/people-organization-mutations"

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

  try {
    await updatePosition(companyId, positionId, parsedInput.data)
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof PeopleOrganizationMutationError
          ? error.message
          : "Erro ao atualizar cargo.",
    }
  }

  revalidatePath("/app/company")
  revalidatePath("/app/company/positions")
  revalidatePath(`/app/company/positions/${positionId}`)

  return {
    success: true,
    message: "Cargo atualizado com sucesso.",
  }
}

"use server"

import { revalidatePath } from "next/cache"

import {
  createPosition,
  isValidSubmissionId,
  PeopleOrganizationMutationError,
  submissionIdFromInput,
} from "@/features/people-organization-mutations"

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

  const submissionId = submissionIdFromInput(input)
  if (!isValidSubmissionId(submissionId)) {
    return {
      success: false,
      message: "Dados inválidos para criar cargo.",
    }
  }

  let positionId: string | undefined
  try {
    const result = await createPosition(
      companyId,
      parsedInput.data,
      submissionId
    )
    positionId = result.positionId
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof PeopleOrganizationMutationError
          ? error.message
          : "Erro ao criar cargo.",
    }
  }

  revalidatePath("/app/company")
  revalidatePath("/app/company/positions")
  if (positionId) {
    revalidatePath(`/app/company/positions/${positionId}`)
  }

  return {
    success: true,
    message: "Cargo criado com sucesso.",
  }
}

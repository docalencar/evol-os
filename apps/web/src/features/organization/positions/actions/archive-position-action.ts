"use server"

import { revalidatePath } from "next/cache"

import {
  archivePosition,
  PeopleOrganizationMutationError,
} from "@/features/people-organization-mutations"

export async function archivePositionAction(
  companyId: string,
  positionId: string
) {
  try {
    await archivePosition(companyId, positionId)
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof PeopleOrganizationMutationError
          ? error.message
          : "Erro ao arquivar cargo.",
    }
  }

  revalidatePath("/app/company")
  revalidatePath("/app/company/positions")
  revalidatePath(`/app/company/positions/${positionId}`)

  return {
    success: true,
    message: "Cargo arquivado com sucesso.",
  }
}

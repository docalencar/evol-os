"use server"

import {
  revalidatePath,
} from "next/cache"

import {
  failureResult,
  successResult,
} from "@/lib/actions"

import {
  createPositionRepository,
} from "../repositories/position-repository"

export async function archivePositionAction(
  companyId: string,
  positionId: string
) {
  try {
    const repository =
      await createPositionRepository()

    const { error } =
      await repository.archive(
        companyId,
        positionId
      )

    if (error) {
      console.error(
        "Erro Supabase archivePositionAction:",
        {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          companyId,
          positionId,
        }
      )

      return failureResult(
        error.message ||
          "Erro ao arquivar cargo."
      )
    }

    revalidatePath(
      "/app/company/positions"
    )

    return successResult(
      "Cargo arquivado com sucesso."
    )
  } catch (error) {
    console.error(
      "Erro inesperado archivePositionAction:",
      error
    )

    return failureResult(
      error instanceof Error
        ? error.message
        : "Erro ao arquivar cargo."
    )
  }
}
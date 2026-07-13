"use server"

import {
  revalidatePath,
} from "next/cache"

import {
  failureResult,
  successResult,
} from "@/lib/actions"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  createPositionRequirementRepository,
} from "../repositories/position-requirement-repository"

import {
  updatePositionRequirementSchema,
} from "../schemas/position-requirement-schema"

export async function updatePositionRequirementAction(
  positionRequirementId: string,
  input: unknown
) {
  const parsed =
    updatePositionRequirementSchema.safeParse(
      input
    )

  if (!parsed.success) {
    return failureResult(
      parsed.error.issues[0]?.message ??
        "Dados inválidos."
    )
  }

  try {
    const { companyId } =
      await getCurrentCompanyContext()

    const repository =
      await createPositionRequirementRepository()

    const { error } =
      await repository.update(
        companyId,
        positionRequirementId,
        parsed.data
      )

    if (error) {
      console.error(
        "Erro Supabase updatePositionRequirementAction:",
        {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          positionRequirementId,
        }
      )

      return failureResult(
        "Não foi possível atualizar o requisito técnico."
      )
    }

    revalidatePath(
      "/app/company/positions"
    )

    revalidatePath(
      `/app/company/positions/${parsed.data.positionId}`
    )

    return successResult(
      "Requisito técnico atualizado com sucesso."
    )
  } catch (error) {
    console.error(
      "Erro inesperado updatePositionRequirementAction:",
      error
    )

    return failureResult(
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar o requisito técnico."
    )
  }
}

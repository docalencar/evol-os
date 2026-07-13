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
  createPositionRequirementSchema,
} from "../schemas/position-requirement-schema"

export async function createPositionRequirementAction(
  input: unknown
) {
  const parsed =
    createPositionRequirementSchema.safeParse(
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
      await repository.create(
        companyId,
        parsed.data
      )

    if (error) {
      console.error(
        "Erro Supabase createPositionRequirementAction:",
        {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        }
      )

      return failureResult(
        "Não foi possível cadastrar o requisito técnico."
      )
    }

    revalidatePath(
      "/app/company/positions"
    )

    revalidatePath(
      `/app/company/positions/${parsed.data.positionId}`
    )

    return successResult(
      "Requisito técnico cadastrado com sucesso."
    )
  } catch (error) {
    console.error(
      "Erro inesperado createPositionRequirementAction:",
      error
    )

    return failureResult(
      error instanceof Error
        ? error.message
        : "Não foi possível cadastrar o requisito técnico."
    )
  }
}

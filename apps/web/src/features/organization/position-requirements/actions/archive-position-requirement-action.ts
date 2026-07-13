"use server"

import {
  revalidatePath,
} from "next/cache"

import { z } from "zod"

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

const archivePositionRequirementSchema =
  z.object({
    positionRequirementId: z
      .string()
      .uuid(
        "Requisito técnico inválido."
      ),

    positionId: z
      .string()
      .uuid(
        "Cargo inválido."
      ),
  })

type ArchivePositionRequirementInput =
  z.infer<
    typeof archivePositionRequirementSchema
  >

export async function archivePositionRequirementAction(
  input: ArchivePositionRequirementInput
) {
  const parsed =
    archivePositionRequirementSchema.safeParse(
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
      await repository.archive(
        companyId,
        parsed.data.positionRequirementId
      )

    if (error) {
      console.error(
        "Erro Supabase archivePositionRequirementAction:",
        {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          positionRequirementId:
            parsed.data
              .positionRequirementId,
        }
      )

      return failureResult(
        "Não foi possível arquivar o requisito técnico."
      )
    }

    revalidatePath(
      "/app/company/positions"
    )

    revalidatePath(
      `/app/company/positions/${parsed.data.positionId}`
    )

    return successResult(
      "Requisito técnico arquivado com sucesso."
    )
  } catch (error) {
    console.error(
      "Erro inesperado archivePositionRequirementAction:",
      error
    )

    return failureResult(
      error instanceof Error
        ? error.message
        : "Não foi possível arquivar o requisito técnico."
    )
  }
}

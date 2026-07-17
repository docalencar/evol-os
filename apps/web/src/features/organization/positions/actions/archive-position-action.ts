"use server"

import {
  revalidatePath,
} from "next/cache"

import {
  recordActivity,
} from "@/features/activity"
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

    const { data: position } =
      await repository.findById(
        companyId,
        positionId
      )

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

    try {
      await recordActivity({
        companyId,
        activityType: "position.archived",
        module: "organization",
        title: "Cargo arquivado",
        description: position?.name
          ? `O cargo ${position.name} foi arquivado.`
          : "Um cargo foi arquivado.",
        actorType: "user",
        entityType: "position",
        entityId: positionId,
        visibility: "company",
        metadata: {
          positionId,
          positionName:
            position?.name ?? null,
          departmentId:
            position?.department_id ?? null,
          hierarchicalLevel:
            position?.hierarchical_level ?? null,
          status:
            position?.status ?? null,
        },
      })
    } catch (activityError) {
      console.error(
        "Erro ao registrar atividade de arquivamento do cargo:",
        activityError
      )
    }

    revalidatePath("/app/company")
    revalidatePath(
      "/app/company/positions"
    )
    revalidatePath(
      `/app/company/positions/${positionId}`
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

"use server"

import { revalidatePath } from "next/cache"

import { requireAssessmentAdministrator } from "../application/assessment-authorization"
import { loadAssessmentActor } from "../application/load-assessment-actor"
import { createAssessmentCycleRepository } from "../repositories/assessment-cycle-repository"

type ArchiveAssessmentCycleActionState = {
  success: boolean
  message: string
}

export async function archiveAssessmentCycleAction(
  companyId: string,
  assessmentCycleId: string
): Promise<ArchiveAssessmentCycleActionState> {
  try {
    const actor = await loadAssessmentActor()
    requireAssessmentAdministrator(actor, companyId)
  } catch {
    return {
      success: false,
      message: "Você não possui permissão para arquivar ciclos de avaliação.",
    }
  }

  const repository = await createAssessmentCycleRepository()

  const { error } = await repository.archive(
    companyId,
    assessmentCycleId
  )

  if (error) {
    return {
      success: false,
      message: "Não foi possível arquivar o ciclo de avaliação.",
    }
  }

  revalidatePath("/app/assessments")

  return {
    success: true,
    message: "Ciclo de avaliação arquivado com sucesso.",
  }
}

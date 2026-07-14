"use server"

import { revalidatePath } from "next/cache"

import { createAssessmentCycleRepository } from "../repositories/assessment-cycle-repository"

type ArchiveAssessmentCycleActionState = {
  success: boolean
  message: string
}

export async function archiveAssessmentCycleAction(
  companyId: string,
  assessmentCycleId: string
): Promise<ArchiveAssessmentCycleActionState> {
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

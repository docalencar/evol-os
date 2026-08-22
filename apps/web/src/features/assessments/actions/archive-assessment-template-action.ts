"use server"

import { revalidatePath } from "next/cache"

import { createAssessmentTemplateRepository } from "../repositories/assessment-template-repository"

type ArchiveAssessmentTemplateActionState = {
  success: boolean
  message: string
}

export async function archiveAssessmentTemplateAction(
  companyId: string,
  assessmentTemplateId: string
): Promise<ArchiveAssessmentTemplateActionState> {
  const repository = await createAssessmentTemplateRepository()

  const { error } = await repository.archive(
    companyId,
    assessmentTemplateId
  )

  if (error) {
    return {
      success: false,
      message: "Não foi possível arquivar o modelo de avaliação.",
    }
  }

  revalidatePath("/app/assessments")
  revalidatePath(
    `/app/assessments/templates/${assessmentTemplateId}`
  )

  return {
    success: true,
    message: "Modelo de avaliação arquivado com sucesso.",
  }
}

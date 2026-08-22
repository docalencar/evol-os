"use server"

import { revalidatePath } from "next/cache"

import { createAssessmentSectionRepository } from "../repositories/assessment-section-repository"

export async function archiveAssessmentSectionAction(
  companyId: string,
  assessmentSectionId: string,
  assessmentTemplateId: string
) {
  const repository = await createAssessmentSectionRepository()

  const { error } = await repository.archive(
    companyId,
    assessmentSectionId
  )

  if (error) {
    return {
      success: false,
      message: "Não foi possível arquivar a seção.",
    }
  }

  revalidatePath("/app/assessments")
  revalidatePath(
    `/app/assessments/templates/${assessmentTemplateId}`
  )

  return {
    success: true,
    message: "Seção arquivada com sucesso.",
  }
}

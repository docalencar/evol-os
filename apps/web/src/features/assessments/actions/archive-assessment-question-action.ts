"use server"

import { revalidatePath } from "next/cache"

import { createAssessmentQuestionRepository } from "../repositories/assessment-question-repository"

export async function archiveAssessmentQuestionAction(
  companyId: string,
  assessmentQuestionId: string
) {
  const repository =
    await createAssessmentQuestionRepository()

  const { error } =
    await repository.archive(
      companyId,
      assessmentQuestionId
    )

  if (error) {
    console.error(error)

    return {
      success: false,
      message: error.message,
    }
  }

  revalidatePath("/app/assessments")

  return {
    success: true,
    message:
      "Pergunta arquivada com sucesso.",
  }
}

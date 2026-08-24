"use server"

import { revalidatePath } from "next/cache"

import { createAssessmentResponseRepository } from "../repositories/assessment-response-repository"

type SubmitAssessmentResponseResult = {
  success: boolean
  message: string
  status?: "succeeded" | "already_submitted"
}

export async function submitAssessmentResponseAction(
  companyId: string,
  assessmentResponseId: string
): Promise<SubmitAssessmentResponseResult> {
  const repository = await createAssessmentResponseRepository()
  const { data, error } = await repository.submit(
    companyId,
    assessmentResponseId
  )

  if (error) {
    console.error("Assessment Response Submit Error:", error)

    return {
      success: false,
      message: error.message.includes(
        "ASSESSMENT_REQUIRED_ANSWERS_MISSING"
      )
        ? "Responda todas as perguntas obrigatórias antes de enviar."
        : "Não foi possível enviar a avaliação.",
    }
  }

  const result = data as {
    status?: "succeeded" | "already_submitted"
  } | null

  revalidatePath("/app/assessments")
  revalidatePath(
    `/app/assessments/responses/${assessmentResponseId}`
  )

  return {
    success: true,
    status: result?.status ?? "succeeded",
    message:
      result?.status === "already_submitted"
        ? "Esta avaliação já havia sido enviada."
        : "Avaliação enviada com sucesso.",
  }
}

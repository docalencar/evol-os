"use server"

import { revalidatePath } from "next/cache"

import { z } from "zod"

import { createAssessmentResponseRepository } from "../repositories/assessment-response-repository"

type SubmitAssessmentResponseActionState = {
  success: boolean
  message: string
}

export async function submitAssessmentResponseAction(
  companyId: string,
  assessmentResponseId: string
): Promise<SubmitAssessmentResponseActionState> {
  const parsedId = z
    .string()
    .uuid()
    .safeParse(assessmentResponseId)

  if (!parsedId.success) {
    return {
      success: false,
      message: "Execução de avaliação inválida.",
    }
  }

  const repository =
    await createAssessmentResponseRepository()

  const { error } = await repository.updateStatus(
    companyId,
    parsedId.data,
    "submitted"
  )

  if (error) {
    console.error("Assessment Response Submit Error:", error)

    return {
      success: false,
      message: error.message,
    }
  }

  revalidatePath("/app/assessments")
  revalidatePath(
    `/app/assessments/responses/${parsedId.data}`
  )

  return {
    success: true,
    message: "Avaliação enviada com sucesso.",
  }
}

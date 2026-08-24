"use server"

import { revalidatePath } from "next/cache"

import { createAssessmentAnswerRepository } from "../repositories/assessment-answer-repository"
import {
  saveAssessmentAnswerSchema,
  type SaveAssessmentAnswerInput,
} from "../schemas/assessment-answer-schema"

type SaveAssessmentAnswerActionState = {
  success: boolean
  message: string
  status?: "succeeded" | "no_change"
  assessmentQuestionId?: string
}

export async function saveAssessmentAnswerAction(
  companyId: string,
  input: SaveAssessmentAnswerInput
): Promise<SaveAssessmentAnswerActionState> {
  const parsed = saveAssessmentAnswerSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ?? "Resposta inválida.",
    }
  }

  const repository = await createAssessmentAnswerRepository()
  const { data, error } = await repository.save({
    companyId,
    ...parsed.data,
  })

  if (error) {
    console.error("Assessment Answer Save Error:", error)
    return {
      success: false,
      message: "Não foi possível salvar a resposta.",
    }
  }

  const result = data as {
    status?: "succeeded" | "no_change"
    assessmentQuestionId?: string
  } | null

  revalidatePath(
    `/app/assessments/responses/${parsed.data.assessmentResponseId}`
  )

  return {
    success: true,
    status: result?.status ?? "succeeded",
    assessmentQuestionId:
      result?.assessmentQuestionId ?? parsed.data.assessmentQuestionId,
    message:
      result?.status === "no_change"
        ? "Resposta já estava salva."
        : "Resposta salva automaticamente.",
  }
}

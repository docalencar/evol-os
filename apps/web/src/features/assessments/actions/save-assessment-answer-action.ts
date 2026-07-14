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
        parsed.error.issues[0]?.message ??
        "Resposta inválida.",
    }
  }

  const repository =
    await createAssessmentAnswerRepository()

  const { error } = await repository.save({
    companyId,
    ...parsed.data,
  })

  if (error) {
    console.error("Assessment Answer Save Error:", error)

    return {
      success: false,
      message: error.message,
    }
  }

  revalidatePath(
    `/app/assessments/responses/${parsed.data.assessmentResponseId}`
  )

  return {
    success: true,
    message: "Resposta salva.",
  }
}

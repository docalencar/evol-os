"use server"

import { revalidatePath } from "next/cache"

import { createAssessmentAnswerRepository } from "../repositories/assessment-answer-repository"
import { createAssessmentResponseRepository } from "../repositories/assessment-response-repository"
import {
  saveAssessmentAnswerSchema,
  type SaveAssessmentAnswerInput,
} from "../schemas/assessment-answer-schema"
import type { AssessmentResponse } from "../types/assessment-response"

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

  const responseRepository =
    await createAssessmentResponseRepository()

  const {
    data: responseData,
    error: responseError,
  } = await responseRepository.findById(
    companyId,
    parsed.data.assessmentResponseId
  )

  if (responseError || !responseData) {
    return {
      success: false,
      message: "Avaliação não encontrada.",
    }
  }

  const response =
    responseData as AssessmentResponse

  if (
    response.status === "submitted" ||
    response.status === "completed" ||
    response.status === "cancelled"
  ) {
    return {
      success: false,
      message:
        "Esta avaliação não pode mais ser editada.",
    }
  }

  const answerRepository =
    await createAssessmentAnswerRepository()

  const { error: answerError } =
    await answerRepository.save({
      companyId,
      ...parsed.data,
    })

  if (answerError) {
    console.error(
      "Assessment Answer Save Error:",
      answerError
    )

    return {
      success: false,
      message:
        "Não foi possível salvar a resposta.",
    }
  }

  if (response.status === "draft") {
    const { error: statusError } =
      await responseRepository.updateStatus(
        companyId,
        response.id,
        "in_progress"
      )

    if (statusError) {
      console.error(
        "Assessment Response Status Error:",
        statusError
      )

      return {
        success: false,
        message:
          "A resposta foi salva, mas não foi possível iniciar a avaliação.",
      }
    }
  }

  revalidatePath(
    `/app/assessments/responses/${response.id}`
  )

  revalidatePath(
    `/app/assessments/cycles/${response.assessment_cycle_id}`
  )

  return {
    success: true,
    message: "Resposta salva automaticamente.",
  }
}

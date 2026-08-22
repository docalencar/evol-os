"use server"

import { revalidatePath } from "next/cache"

import { getAssessmentResponsePageReadModel } from "@/features/assessment-feedback-read"

import { requireAssessmentEvaluator } from "../application/assessment-authorization"
import { loadAssessmentActor } from "../application/load-assessment-actor"
import { createAssessmentResponseRepository } from "../repositories/assessment-response-repository"
import type { AssessmentResponse } from "../types/assessment-response"

type SubmitAssessmentResponseResult = {
  success: boolean
  message: string
}

export async function submitAssessmentResponseAction(
  companyId: string,
  assessmentResponseId: string
): Promise<SubmitAssessmentResponseResult> {
  const responseRepository =
    await createAssessmentResponseRepository()

  const {
    data: responseData,
    error: responseError,
  } = await responseRepository.findById(
    companyId,
    assessmentResponseId
  )

  if (responseError || !responseData) {
    return {
      success: false,
      message: "Avaliação não encontrada.",
    }
  }

  const response =
    responseData as AssessmentResponse

  try {
    const actor = await loadAssessmentActor()
    requireAssessmentEvaluator(actor, response, "write")
  } catch {
    return {
      success: false,
      message: "Você não possui permissão para enviar esta avaliação.",
    }
  }

  if (
    response.status === "submitted" ||
    response.status === "completed" ||
    response.status === "cancelled"
  ) {
    return {
      success: false,
      message:
        "Esta avaliação não pode mais ser enviada.",
    }
  }

  let workspace

  try {
    workspace = await getAssessmentResponsePageReadModel(
      companyId,
      assessmentResponseId
    )
  } catch {
    return {
      success: false,
      message:
        "Não foi possível carregar a avaliação.",
    }
  }

  if (!workspace) {
    return {
      success: false,
      message: "Avaliação não encontrada.",
    }
  }

  const { questions, answers } = workspace

  const answeredQuestionIds = new Set(
    answers.map(
      (answer) => answer.assessment_question_id
    )
  )

  const missingRequiredQuestions = questions.filter(
    (question) =>
      question.active &&
      question.required &&
      !answeredQuestionIds.has(question.id)
  )

  if (missingRequiredQuestions.length > 0) {
    return {
      success: false,
      message:
        "Responda todas as perguntas obrigatórias antes de enviar.",
    }
  }

  const { error: statusError } =
    await responseRepository.updateStatus(
      companyId,
      assessmentResponseId,
      "submitted"
    )

  if (statusError) {
    return {
      success: false,
      message:
        "Não foi possível enviar a avaliação.",
    }
  }

  revalidatePath("/app/assessments")
  revalidatePath(
    `/app/assessments/cycles/${response.assessment_cycle_id}`
  )
  revalidatePath(
    `/app/assessments/responses/${assessmentResponseId}`
  )

  return {
    success: true,
    message: "Avaliação enviada com sucesso.",
  }
}

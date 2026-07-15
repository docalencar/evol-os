"use server"

import { revalidatePath } from "next/cache"

import { createAssessmentAnswerRepository } from "../repositories/assessment-answer-repository"
import { createAssessmentQuestionRepository } from "../repositories/assessment-question-repository"
import { createAssessmentResponseRepository } from "../repositories/assessment-response-repository"
import { createAssessmentSectionRepository } from "../repositories/assessment-section-repository"
import type { AssessmentQuestion } from "../types/assessment-question"
import type { AssessmentResponse } from "../types/assessment-response"
import type { AssessmentSection } from "../types/assessment-section"

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

  const sectionRepository =
    await createAssessmentSectionRepository()

  const questionRepository =
    await createAssessmentQuestionRepository()

  const answerRepository =
    await createAssessmentAnswerRepository()

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

  const {
    data: sectionsData,
    error: sectionsError,
  } = await sectionRepository.findAllByTemplate(
    companyId,
    response.assessment_template_id
  )

  if (sectionsError) {
    return {
      success: false,
      message:
        "Não foi possível carregar as seções da avaliação.",
    }
  }

  const sections =
    (sectionsData ?? []) as AssessmentSection[]

  const questionResults = await Promise.all(
    sections.map((section) =>
      questionRepository.findAllBySection(
        companyId,
        section.id
      )
    )
  )

  const questionError = questionResults.find(
    (result) => result.error
  )?.error

  if (questionError) {
    return {
      success: false,
      message:
        "Não foi possível carregar as perguntas da avaliação.",
    }
  }

  const questions = questionResults.flatMap(
    (result) =>
      (result.data ?? []) as AssessmentQuestion[]
  )

  const {
    data: answers,
    error: answerError,
  } = await answerRepository.findAllByResponse(
    companyId,
    assessmentResponseId
  )

  if (answerError) {
    return {
      success: false,
      message:
        "Não foi possível carregar as respostas da avaliação.",
    }
  }

  const answeredQuestionIds = new Set(
    (answers ?? []).map(
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

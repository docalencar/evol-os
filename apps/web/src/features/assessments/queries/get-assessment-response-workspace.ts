import { isAdministrativeRole } from "@/features/authorization"

import { readAssessmentAdministratively } from "../application/assessment-administrative-read-service"
import { requireAssessmentEvaluator } from "../application/assessment-authorization"
import { loadAssessmentActor } from "../application/load-assessment-actor"
import { createAssessmentQuestionRepository } from "../repositories/assessment-question-repository"
import { createAssessmentResponseRepository } from "../repositories/assessment-response-repository"
import { createAssessmentSectionRepository } from "../repositories/assessment-section-repository"

export async function getAssessmentResponseWorkspace(
  companyId: string,
  assessmentResponseId: string
) {
  const actor = await loadAssessmentActor()

  if (actor.companyId !== companyId) {
    throw new Error("ASSESSMENT_ACCESS_DENIED")
  }

  const responseRepository =
    await createAssessmentResponseRepository()

  const sectionRepository =
    await createAssessmentSectionRepository()

  const questionRepository =
    await createAssessmentQuestionRepository()

  const administrativeRead = isAdministrativeRole(actor.role)
    ? await readAssessmentAdministratively(
        companyId,
        "response",
        assessmentResponseId,
        "open_assessment_workspace"
      )
    : null

  const directResult = administrativeRead
    ? { data: administrativeRead.responses[0] ?? null, error: null }
    : await responseRepository.findById(companyId, assessmentResponseId)

  const { data: response, error: responseError } = directResult

  if (responseError || !response) {
    throw new Error(
      responseError?.message ??
        "Avaliação não encontrada."
    )
  }

  if (!administrativeRead) {
    requireAssessmentEvaluator(actor, response, "read")
  }

  const {
    data: sections,
    error: sectionsError,
  } = await sectionRepository.findAllByTemplate(
    companyId,
    response.assessment_template_id
  )

  if (sectionsError) {
    throw new Error(sectionsError.message)
  }

  const sectionList = sections ?? []

  const questionResults = await Promise.all(
    sectionList.map((section) =>
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
    throw new Error(questionError.message)
  }

  const questions = questionResults.flatMap(
    (result) => result.data ?? []
  )

  return {
    response,
    sections: sectionList,
    questions,
  }
}

import { createAssessmentQuestionRepository } from "../repositories/assessment-question-repository"
import { createAssessmentResponseRepository } from "../repositories/assessment-response-repository"
import { createAssessmentSectionRepository } from "../repositories/assessment-section-repository"

export async function getAssessmentResponseWorkspace(
  companyId: string,
  assessmentResponseId: string
) {
  const responseRepository =
    await createAssessmentResponseRepository()

  const sectionRepository =
    await createAssessmentSectionRepository()

  const questionRepository =
    await createAssessmentQuestionRepository()

  const {
    data: response,
    error: responseError,
  } = await responseRepository.findById(
    companyId,
    assessmentResponseId
  )

  if (responseError || !response) {
    throw new Error(
      responseError?.message ??
        "Avaliação não encontrada."
    )
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

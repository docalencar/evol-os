import {
  createAssessmentQuestionRepository,
} from "../repositories/assessment-question-repository"

export async function getAssessmentQuestions(
  companyId: string,
  assessmentSectionId: string
) {
  const repository =
    await createAssessmentQuestionRepository()

  const { data, error } =
    await repository.findAllBySection(
      companyId,
      assessmentSectionId
    )

  if (error) {
    throw error
  }

  return data
}

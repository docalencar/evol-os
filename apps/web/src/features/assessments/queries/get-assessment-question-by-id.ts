import {
  createAssessmentQuestionRepository,
} from "../repositories/assessment-question-repository"

export async function getAssessmentQuestionById(
  companyId: string,
  questionId: string
) {
  const repository =
    await createAssessmentQuestionRepository()

  const { data, error } =
    await repository.findById(
      companyId,
      questionId
    )

  if (error) {
    throw error
  }

  return data
}

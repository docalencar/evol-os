import { createAssessmentAnswerRepository } from "../repositories/assessment-answer-repository"

export async function getAssessmentAnswers(
  companyId: string,
  assessmentResponseId: string
) {
  const repository =
    await createAssessmentAnswerRepository()

  const { data, error } = await repository.findAllByResponse(
    companyId,
    assessmentResponseId
  )

  if (error) {
    throw error
  }

  return data
}

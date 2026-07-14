import { createAssessmentResponseRepository } from "../repositories/assessment-response-repository"

export async function getAssessmentResponseById(
  companyId: string,
  assessmentResponseId: string
) {
  const repository =
    await createAssessmentResponseRepository()

  const { data, error } = await repository.findById(
    companyId,
    assessmentResponseId
  )

  if (error) {
    throw error
  }

  return data
}

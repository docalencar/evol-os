import { createAssessmentAnswerRepository } from "../repositories/assessment-answer-repository"
import type { AssessmentAnswer } from "../types/assessment-answer"

import { calculateAssessmentStatistics } from "../services/calculate-assessment-statistics"
import { getAssessmentResponsesByCycle } from "./get-assessment-responses-by-cycle"

export async function getAssessmentCycleStatistics(
  companyId: string,
  assessmentCycleId: string
) {
  const responses =
    await getAssessmentResponsesByCycle(
      companyId,
      assessmentCycleId
    )

  const responseIds = responses.map(
    (response) => response.id
  )

  const repository =
    await createAssessmentAnswerRepository()

  const { data, error } =
    await repository.findAllByResponses(
      companyId,
      responseIds
    )

  if (error) {
    throw new Error(error.message)
  }

  return calculateAssessmentStatistics(
    (data ?? []) as AssessmentAnswer[]
  )
}

import type {
  AssessmentResponse,
} from "@/features/assessments"

import {
  getAssessmentCycles,
  getAssessmentResponsesByCycle,
} from "@/features/assessments"

import { createAssessmentSummary } from "../services/create-assessment-summary"

import type { AssessmentSummary } from "../types/assessment-summary"

export async function getAssessmentSummary(
  companyId: string,
): Promise<AssessmentSummary> {
  const cycles =
    await getAssessmentCycles(companyId)

  const responseLists =
    await Promise.all(
      cycles.map((cycle) =>
        getAssessmentResponsesByCycle(
          companyId,
          cycle.id,
        ),
      ),
    )

  const responses: AssessmentResponse[] =
    responseLists.flat()

  return createAssessmentSummary({
    cycles,
    responses,
    averageScore: null,
  })
}

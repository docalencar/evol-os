import type {
  AssessmentResponse,
} from "@/features/assessments"

import {
  getAssessmentCycles,
  getAssessmentResponsesByCycle,
} from "@/features/assessments"

import { getAssessmentCycleStatistics } from "./get-assessment-cycle-statistics"

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

  const statistics =
    await Promise.all(
      cycles.map((cycle) =>
        getAssessmentCycleStatistics(
          companyId,
          cycle.id,
        ),
      ),
    )

  const validAverages = statistics
    .map((statistic) => statistic.average)
    .filter(
      (score): score is number =>
        score !== null &&
        Number.isFinite(score),
    )

  const averageScore =
    validAverages.length === 0
      ? null
      : validAverages.reduce(
          (total, score) => total + score,
          0,
        ) / validAverages.length

  return createAssessmentSummary({
    cycles,
    responses,
    averageScore,
  })
}

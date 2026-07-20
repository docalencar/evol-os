import type {
  AssessmentCycle,
  AssessmentResponse,
} from "@/features/assessments"

import type { AssessmentSummary } from "../types/assessment-summary"

type CreateAssessmentSummaryInput = {
  cycles: AssessmentCycle[]
  responses: AssessmentResponse[]
  averageScore: number | null
}

export function createAssessmentSummary({
  cycles,
  responses,
  averageScore,
}: CreateAssessmentSummaryInput): AssessmentSummary {
  return {
    cycles: {
      total: cycles.length,
      active: cycles.filter(
        (cycle) => cycle.status === "active",
      ).length,
      completed: cycles.filter(
        (cycle) => cycle.status === "completed",
      ).length,
    },

    responses: {
      total: responses.length,
      completed: responses.filter(
        (response) => response.status === "completed",
      ).length,
    },

    averageScore,
  }
}

import { readAssessmentAdministratively } from "@/features/assessments/application/assessment-administrative-read-service"

import { calculateAssessmentStatistics } from "../services/calculate-assessment-statistics"

export async function getAssessmentCycleStatistics(
  companyId: string,
  assessmentCycleId: string
) {
  const result = await readAssessmentAdministratively(
    companyId,
    "cycle",
    assessmentCycleId,
    "calculate_assessment_cycle_statistics"
  )

  return calculateAssessmentStatistics(
    result.answers
  )
}

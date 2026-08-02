import { readAssessmentAdministratively } from "../application/assessment-administrative-read-service"

export async function getAssessmentResponsesByCycle(
  companyId: string,
  assessmentCycleId: string
) {
  const result = await readAssessmentAdministratively(
    companyId,
    "cycle",
    assessmentCycleId,
    "monitor_assessment_cycle"
  )

  return result.responses
}

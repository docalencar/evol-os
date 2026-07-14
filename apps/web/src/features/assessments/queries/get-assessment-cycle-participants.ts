import { createAssessmentCycleParticipantRepository } from "../repositories/assessment-cycle-participant-repository"

export async function getAssessmentCycleParticipants(
  companyId: string,
  assessmentCycleId: string
) {
  const repository =
    await createAssessmentCycleParticipantRepository()

  const { data, error } =
    await repository.findByCycle(
      companyId,
      assessmentCycleId
    )

  if (error) {
    throw new Error(error.message)
  }

  return data
}

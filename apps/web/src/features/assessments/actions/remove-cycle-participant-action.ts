"use server"

import { revalidatePath } from "next/cache"

import { requireAssessmentAdministrator } from "../application/assessment-authorization"
import { loadAssessmentActor } from "../application/load-assessment-actor"
import { createAssessmentCycleParticipantRepository } from "../repositories/assessment-cycle-participant-repository"

type Input = {
  companyId: string
  assessmentCycleId: string
  employeeId: string
}

export async function removeCycleParticipantAction({
  companyId,
  assessmentCycleId,
  employeeId,
}: Input) {
  try {
    const actor = await loadAssessmentActor()
    requireAssessmentAdministrator(actor, companyId)
  } catch {
    return {
      success: false,
      message: "Você não possui permissão para alterar participantes.",
    }
  }

  const repository = await createAssessmentCycleParticipantRepository()
  const { error } = await repository.removeParticipant(
    companyId,
    assessmentCycleId,
    employeeId
  )

  if (error) {
    return {
      success: false,
      message:
        error.message === "ASSESSMENT_PARTICIPANT_HAS_RESPONSES"
          ? "Este participante não pode ser removido porque já possui avaliações no ciclo."
          : "Não foi possível remover o participante.",
    }
  }

  revalidatePath(`/app/assessments/cycles/${assessmentCycleId}`)
  return { success: true, message: "Participante removido com sucesso." }
}

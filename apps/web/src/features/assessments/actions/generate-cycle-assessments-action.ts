"use server"

import { revalidatePath } from "next/cache"

import { requireAssessmentAdministrator } from "../application/assessment-authorization"
import { loadAssessmentActor } from "../application/load-assessment-actor"
import { createAssessmentCycleParticipantRepository } from "../repositories/assessment-cycle-participant-repository"
import { createAssessmentResponseRepository } from "../repositories/assessment-response-repository"

type GenerateCycleAssessmentsInput = {
  companyId: string
  assessmentCycleId: string
  assessmentTemplateId: string
}

export async function generateCycleAssessmentsAction({
  companyId,
  assessmentCycleId,
  assessmentTemplateId,
}: GenerateCycleAssessmentsInput) {
  try {
    const actor = await loadAssessmentActor()
    requireAssessmentAdministrator(actor, companyId)
  } catch {
    return {
      success: false,
      message: "Você não possui permissão para gerar avaliações.",
    }
  }

  const participantRepository =
    await createAssessmentCycleParticipantRepository()

  const { data: participants, error: participantsError } =
    await participantRepository.findByCycle(
      companyId,
      assessmentCycleId
    )

  if (participantsError) {
    return {
      success: false,
      message:
        "Não foi possível carregar os participantes do ciclo.",
    }
  }

  const employeeIds = (participants ?? []).map(
    (participant) => participant.employee_id as string
  )

  if (employeeIds.length === 0) {
    return {
      success: false,
      message:
        "Adicione pelo menos um participante antes de gerar as avaliações.",
    }
  }

  const responseRepository =
    await createAssessmentResponseRepository()

  const { error } =
    await responseRepository.generateSelfAssessments(
      companyId,
      assessmentCycleId,
      assessmentTemplateId,
      employeeIds
    )

  if (error) {
    console.error(
      "Erro ao gerar avaliações do ciclo:",
      error
    )

    return {
      success: false,
      message:
        "Não foi possível gerar as avaliações do ciclo.",
    }
  }

  revalidatePath(
    `/app/assessments/cycles/${assessmentCycleId}`
  )

  return {
    success: true,
    message: `${employeeIds.length} avaliação(ões) gerada(s) com sucesso.`,
  }
}

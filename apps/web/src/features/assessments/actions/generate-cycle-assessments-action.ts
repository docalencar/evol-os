"use server"

import { revalidatePath } from "next/cache"

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

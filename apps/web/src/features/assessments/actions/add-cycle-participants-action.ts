"use server"

import { revalidatePath } from "next/cache"

import { requireAssessmentAdministrator } from "../application/assessment-authorization"
import { loadAssessmentActor } from "../application/load-assessment-actor"
import { createAssessmentCycleParticipantRepository } from "../repositories/assessment-cycle-participant-repository"

type Input = {
  companyId: string
  assessmentCycleId: string
  employeeIds: string[]
}

export async function addCycleParticipantsAction({
  companyId,
  assessmentCycleId,
  employeeIds,
}: Input) {
  if (employeeIds.length === 0) {
    return {
      success: false,
      message: "Nenhum colaborador selecionado.",
    }
  }

  try {
    const actor = await loadAssessmentActor()
    requireAssessmentAdministrator(actor, companyId)
  } catch {
    return {
      success: false,
      message: "Você não possui permissão para alterar participantes.",
    }
  }

  const repository =
    await createAssessmentCycleParticipantRepository()

  const { data, error } =
    await repository.addParticipants(
      companyId,
      assessmentCycleId,
      employeeIds
    )

  if (error) {
    return {
      success: false,
      message: "Não foi possível adicionar os participantes.",
    }
  }

  const result = data as {
    status?: "succeeded" | "no_change"
    addedParticipantCount?: number
  } | null
  const addedParticipantCount = result?.addedParticipantCount

  if (
    (result?.status !== "succeeded" && result?.status !== "no_change") ||
    typeof addedParticipantCount !== "number"
  ) {
    return {
      success: false,
      message: "Não foi possível confirmar os participantes adicionados.",
    }
  }

  if (addedParticipantCount > 0) {
    revalidatePath(`/app/assessments/cycles/${assessmentCycleId}`)
  }

  return {
    success: true,
    status: result.status,
    addedParticipantCount,
    message:
      addedParticipantCount > 0
        ? "Participantes adicionados com sucesso."
        : "Os participantes selecionados já fazem parte do ciclo.",
  }
}

"use server"

import { revalidatePath } from "next/cache"

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

  const repository =
    await createAssessmentCycleParticipantRepository()

  const { error } =
    await repository.addParticipants(
      companyId,
      assessmentCycleId,
      employeeIds
    )

  if (error) {
    return {
      success: false,
      message: error.message,
    }
  }

  revalidatePath(`/app/assessments/cycles/${assessmentCycleId}`)

  return {
    success: true,
  }
}

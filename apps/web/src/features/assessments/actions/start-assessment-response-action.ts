"use server"

import { revalidatePath } from "next/cache"

import { requireAssessmentAdministrator } from "../application/assessment-authorization"
import { loadAssessmentActor } from "../application/load-assessment-actor"
import { createAssessmentResponseRepository } from "../repositories/assessment-response-repository"
import {
  startAssessmentResponseSchema,
  type StartAssessmentResponseInput,
} from "../schemas/assessment-response-schema"

type StartAssessmentResponseActionState = {
  success: boolean
  message: string
  assessmentResponseId?: string
}

export async function startAssessmentResponseAction(
  companyId: string,
  input: StartAssessmentResponseInput
): Promise<StartAssessmentResponseActionState> {
  const parsed = startAssessmentResponseSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Dados inválidos para iniciar a avaliação.",
    }
  }

  try {
    const actor = await loadAssessmentActor()
    requireAssessmentAdministrator(actor, companyId)
  } catch {
    return {
      success: false,
      message: "Você não possui permissão para criar avaliações.",
    }
  }

  const repository =
    await createAssessmentResponseRepository()

  const { data, error } = await repository.create({
    companyId,
    ...parsed.data,
  })

  if (error || !data) {
    console.error("Assessment Response Start Error:", error)

    return {
      success: false,
      message:
        error?.message ??
        "Não foi possível iniciar a avaliação.",
    }
  }

  revalidatePath("/app/assessments")

  return {
    success: true,
    message: "Avaliação iniciada com sucesso.",
    assessmentResponseId: data.id,
  }
}

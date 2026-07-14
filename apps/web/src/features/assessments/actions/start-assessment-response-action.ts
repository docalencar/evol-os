"use server"

import { revalidatePath } from "next/cache"

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

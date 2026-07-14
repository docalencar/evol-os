"use server"

import { revalidatePath } from "next/cache"

import { createAssessmentCycleRepository } from "../repositories/assessment-cycle-repository"
import { assessmentCycleSchema } from "../schemas/assessment-cycle-schema"

type AssessmentCycleActionState = {
  success: boolean
  message: string
}

export async function createAssessmentCycleAction(
  companyId: string,
  formData: FormData
): Promise<AssessmentCycleActionState> {
  const parsed = assessmentCycleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    assessmentType: formData.get("assessmentType"),
    status: formData.get("status"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    closeDate: formData.get("closeDate"),
    allowSelfAssessment:
      formData.get("allowSelfAssessment") === "on",
    allowManagerAssessment:
      formData.get("allowManagerAssessment") === "on",
    allowPeerAssessment:
      formData.get("allowPeerAssessment") === "on",
    allowDirectReportAssessment:
      formData.get("allowDirectReportAssessment") === "on",
    anonymous: formData.get("anonymous") === "on",
  })

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Dados inválidos para criar o ciclo.",
    }
  }

  const repository = await createAssessmentCycleRepository()

  const { error } = await repository.create({
    companyId,
    ...parsed.data,
  })

  if (error) {
    return {
      success: false,
      message: "Não foi possível criar o ciclo de avaliação.",
    }
  }

  revalidatePath("/app/assessments")

  return {
    success: true,
    message: "Ciclo de avaliação criado com sucesso.",
  }
}

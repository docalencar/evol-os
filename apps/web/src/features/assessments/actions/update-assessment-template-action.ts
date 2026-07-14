"use server"

import { revalidatePath } from "next/cache"

import { createAssessmentTemplateRepository } from "../repositories/assessment-template-repository"
import { assessmentTemplateSchema } from "../schemas/assessment-template-schema"

type AssessmentTemplateActionState = {
  success: boolean
  message: string
}

export async function updateAssessmentTemplateAction(
  companyId: string,
  assessmentTemplateId: string,
  formData: FormData
): Promise<AssessmentTemplateActionState> {
  const parsedInput = assessmentTemplateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    instructions: formData.get("instructions"),
    type: formData.get("type"),
    status: formData.get("status"),
  })

  if (!parsedInput.success) {
    return {
      success: false,
      message:
        parsedInput.error.issues[0]?.message ??
        "Dados inválidos para atualizar o template.",
    }
  }

  const repository = await createAssessmentTemplateRepository()

  const { error } = await repository.update({
    companyId,
    assessmentTemplateId,
    ...parsedInput.data,
  })

  if (error) {
    return {
      success: false,
      message: "Não foi possível atualizar o template de avaliação.",
    }
  }

  revalidatePath("/app/assessments")

  return {
    success: true,
    message: "Template de avaliação atualizado com sucesso.",
  }
}
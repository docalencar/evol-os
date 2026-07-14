"use server"

import { revalidatePath } from "next/cache"

import { createAssessmentTemplateRepository } from "../repositories/assessment-template-repository"
import { assessmentTemplateSchema } from "../schemas/assessment-template-schema"

type AssessmentTemplateActionState = {
  success: boolean
  message: string
}

export async function createAssessmentTemplateAction(
  companyId: string,
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
        "Dados inválidos para criar o template.",
    }
  }

  const repository = await createAssessmentTemplateRepository()

  const { error } = await repository.create({
    companyId,
    ...parsedInput.data,
  })

  if (error) {
    return {
      success: false,
      message: "Não foi possível criar o template de avaliação.",
    }
  }

  revalidatePath("/app/assessments")

  return {
    success: true,
    message: "Template de avaliação criado com sucesso.",
  }
}
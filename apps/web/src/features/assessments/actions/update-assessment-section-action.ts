"use server"

import { revalidatePath } from "next/cache"

import { createAssessmentSectionRepository } from "../repositories/assessment-section-repository"
import {
  assessmentSectionSchema,
  type AssessmentSectionInput,
} from "../schemas/assessment-section-schema"

type AssessmentSectionActionState = {
  success: boolean
  message: string
}

export async function updateAssessmentSectionAction(
  companyId: string,
  assessmentSectionId: string,
  input: AssessmentSectionInput
): Promise<AssessmentSectionActionState> {
  const parsed = assessmentSectionSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Dados inválidos para atualizar a seção.",
    }
  }

  const repository = await createAssessmentSectionRepository()

  const { error } = await repository.update({
    companyId,
    assessmentSectionId,
    assessmentTemplateId: parsed.data.assessmentTemplateId,
    code: parsed.data.code,
    name: parsed.data.name,
    description: parsed.data.description,
    icon: parsed.data.icon,
    color: parsed.data.color,
    weight: parsed.data.weight,
    displayOrder: parsed.data.displayOrder,
    active: parsed.data.active,
  })

  if (error) {
    console.error("Assessment Section Update Error:", error)

    return {
      success: false,
      message: error.message,
    }
  }

  revalidatePath("/app/assessments")
  revalidatePath(
    `/app/assessments/templates/${parsed.data.assessmentTemplateId}`
  )

  return {
    success: true,
    message: "Seção atualizada com sucesso.",
  }
}

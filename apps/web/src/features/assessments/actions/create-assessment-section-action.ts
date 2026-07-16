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

export async function createAssessmentSectionAction(
  companyId: string,
  input: AssessmentSectionInput
): Promise<AssessmentSectionActionState> {
  const parsed = assessmentSectionSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Dados inválidos para criar a seção.",
    }
  }

  const repository = await createAssessmentSectionRepository()

  const { error } = await repository.create({
    companyId,
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
    console.error(
      "Assessment Section Create Error:",
      error
    )

    if (
      error.code === "23505" &&
      error.message.includes(
        "idx_assessment_sections_unique_name"
      )
    ) {
      return {
        success: false,
        message:
          "Já existe uma seção com esse nome neste template.",
      }
    }

    return {
      success: false,
      message:
        "Não foi possível criar a seção. Tente novamente.",
    }
  }

  revalidatePath("/app/assessments")
  revalidatePath(
    `/app/assessments/templates/${parsed.data.assessmentTemplateId}`
  )

  return {
    success: true,
    message: "Seção criada com sucesso.",
  }
}

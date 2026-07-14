"use server"

import { revalidatePath } from "next/cache"

import {
  assessmentSectionSchema,
  type AssessmentSectionInput,
} from "../schemas/assessment-section-schema"
import { createAssessmentSectionRepository } from "../repositories/assessment-section-repository"

export async function createAssessmentSectionAction(
  companyId: string,
  input: AssessmentSectionInput
) {
  const parsed = assessmentSectionSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
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
    return {
      success: false,
      message: "Não foi possível criar a seção.",
    }
  }

  revalidatePath("/app/assessments")

  return {
    success: true,
    message: "Seção criada com sucesso.",
  }
}

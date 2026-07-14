"use server"

import { revalidatePath } from "next/cache"

import { createAssessmentQuestionRepository } from "../repositories/assessment-question-repository"
import {
  assessmentQuestionSchema,
  type AssessmentQuestionInput,
} from "../schemas/assessment-question-schema"

export async function updateAssessmentQuestionAction(
  companyId: string,
  assessmentQuestionId: string,
  input: AssessmentQuestionInput
) {
  const parsed = assessmentQuestionSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Dados inválidos.",
    }
  }

  const repository =
    await createAssessmentQuestionRepository()

  const { error } =
    await repository.update({
      companyId,
      assessmentQuestionId,
      assessmentSectionId:
        parsed.data.assessmentSectionId,
      code: parsed.data.code,
      question: parsed.data.question,
      helpText: parsed.data.helpText,
      questionType: parsed.data.questionType,
      scaleMin: parsed.data.scaleMin,
      scaleMax: parsed.data.scaleMax,
      weight: parsed.data.weight,
      displayOrder:
        parsed.data.displayOrder,
      required:
        parsed.data.required,
      active: parsed.data.active,
    })

  if (error) {
    console.error(error)

    return {
      success: false,
      message: error.message,
    }
  }

  revalidatePath("/app/assessments")

  return {
    success: true,
    message:
      "Pergunta atualizada com sucesso.",
  }
}

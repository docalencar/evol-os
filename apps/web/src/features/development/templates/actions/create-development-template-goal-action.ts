"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { createDevelopmentTemplateGoal } from "../services/create-development-template-goal"

const addTemplateCompetencySchema = z.object({
  templateId: z.string().uuid(),

  competencyId: z
    .string()
    .uuid("Selecione uma competência."),

  suggestedTargetLevel: z
    .number()
    .int()
    .min(1, "O nível mínimo é 1.")
    .max(5, "O nível máximo é 5."),
})

type AddTemplateCompetencyInput = z.infer<
  typeof addTemplateCompetencySchema
>

export async function createDevelopmentTemplateGoalAction(
  values: AddTemplateCompetencyInput
) {
  const parsed =
    addTemplateCompetencySchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Dados inválidos.",
    }
  }

  const { companyId } =
    await getCurrentCompanyContext()

  try {
    await createDevelopmentTemplateGoal({
      companyId,
      templateId: parsed.data.templateId,
      competencyId: parsed.data.competencyId,
      suggestedTargetLevel:
        parsed.data.suggestedTargetLevel,
    })
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar a competência.",
    }
  }

  revalidatePath(
    `/app/development/templates/${parsed.data.templateId}`
  )

  return {
    success: true,
    message:
      "Competência adicionada ao template com sucesso.",
  }
}

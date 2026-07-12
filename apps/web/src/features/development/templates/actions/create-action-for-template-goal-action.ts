"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { developmentTemplateActionTypeSchema } from "../schemas/development-template-action-schema"
import { createActionForTemplateGoal } from "../services/create-action-for-template-goal"

const createActionForTemplateGoalSchema = z.object({
  templateId: z.string().uuid(),

  templateGoalId: z.string().uuid(),

  title: z
    .string()
    .trim()
    .min(2, "Informe o título da ação."),

  description: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),

  type: developmentTemplateActionTypeSchema,

  suggestedDueDays: z
    .number()
    .int()
    .positive("O prazo deve ser maior que zero.")
    .optional(),
})

type CreateActionForTemplateGoalInput = z.infer<
  typeof createActionForTemplateGoalSchema
>

export async function createActionForTemplateGoalAction(
  values: CreateActionForTemplateGoalInput
) {
  const parsed =
    createActionForTemplateGoalSchema.safeParse(values)

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
    await createActionForTemplateGoal({
      companyId,
      templateId: parsed.data.templateId,
      templateGoalId:
        parsed.data.templateGoalId,
      title: parsed.data.title,
      description: parsed.data.description,
      type: parsed.data.type,
      suggestedDueDays:
        parsed.data.suggestedDueDays,
    })
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar a ação.",
    }
  }

  revalidatePath(
    `/app/development/templates/${parsed.data.templateId}`
  )

  return {
    success: true,
    message:
      "Ação de desenvolvimento adicionada com sucesso.",
  }
}

"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { applyDevelopmentTemplate } from "../application/apply-development-template"

const applyDevelopmentTemplateSchema = z.object({
  employeeId: z.string().uuid(),

  templateId: z.string().uuid(),

  ownerId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("")),

  priority: z.enum([
    "low",
    "medium",
    "high",
  ]),

  startDate: z.string().optional(),

  dueDate: z.string().optional(),
})

type ApplyDevelopmentTemplateInput = z.infer<
  typeof applyDevelopmentTemplateSchema
>

export async function applyDevelopmentTemplateAction(
  values: ApplyDevelopmentTemplateInput
) {
  const parsed =
    applyDevelopmentTemplateSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Dados inválidos.",
    }
  }

  try {
    const result =
      await applyDevelopmentTemplate({
        employeeId: parsed.data.employeeId,
        templateId: parsed.data.templateId,
        ownerId:
          parsed.data.ownerId || undefined,
        priority: parsed.data.priority,
        startDate: parsed.data.startDate,
        dueDate: parsed.data.dueDate,
      })

    revalidatePath("/app/development")

    return {
      success: true,
      message:
        "Plano criado com sucesso.",
      planId: result.planId,
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível aplicar o template.",
    }
  }
}

"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  applyDevelopmentTemplate,
} from "../application/apply-development-template"

const applyDevelopmentTemplateSchema = z.object({
  employeeId: z.string().uuid(
    "Selecione um colaborador."
  ),

  templateId: z.string().uuid(
    "Template inválido."
  ),

  ownerId: z
    .string()
    .uuid("Responsável inválido.")
    .optional()
    .or(z.literal("")),

  priority: z.enum([
    "low",
    "medium",
    "high",
  ]),

  startDate: z
    .string()
    .optional(),

  dueDate: z
    .string()
    .optional(),
})

type ApplyDevelopmentTemplateInput = z.infer<
  typeof applyDevelopmentTemplateSchema
>

function getErrorMessage(
  error: unknown
) {
  if (error instanceof Error) {
    return error.message
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }

  return "Não foi possível criar o plano de desenvolvimento."
}

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
        employeeId:
          parsed.data.employeeId,
        templateId:
          parsed.data.templateId,
        ownerId:
          parsed.data.ownerId ||
          undefined,
        priority:
          parsed.data.priority,
        startDate:
          parsed.data.startDate ||
          undefined,
        dueDate:
          parsed.data.dueDate ||
          undefined,
      })

    revalidatePath(
      "/app/development"
    )

    revalidatePath(
      `/app/development/plans/${result.planId}`
    )

    return {
      success: true,
      message:
        "Plano de desenvolvimento criado com sucesso.",
      planId: result.planId,
    }
  } catch (error) {
    console.error(
      "Erro ao aplicar template de desenvolvimento:",
      error
    )

    return {
      success: false,
      message: getErrorMessage(error),
    }
  }
}

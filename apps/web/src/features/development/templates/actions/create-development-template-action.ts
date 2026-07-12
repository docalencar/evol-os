"use server"

import { revalidatePath } from "next/cache"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { createDevelopmentTemplateSchema } from "../schemas/development-template-schema"
import { createDevelopmentTemplate } from "../services/create-development-template"

export async function createDevelopmentTemplateAction(
  values: unknown
) {
  const parsed =
    createDevelopmentTemplateSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Dados inválidos.",
    }
  }

  const { companyId, user } =
    await getCurrentCompanyContext()

  try {
    await createDevelopmentTemplate({
      companyId,
      createdBy: user.id,
      input: parsed.data,
    })
  } catch {
    return {
      success: false,
      message:
        "Não foi possível criar o template de desenvolvimento.",
    }
  }

  revalidatePath("/app/development")
  revalidatePath("/app/development/templates")

  return {
    success: true,
    message:
      "Template de desenvolvimento criado com sucesso.",
  }
}
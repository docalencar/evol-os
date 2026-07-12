"use server"

import { revalidatePath } from "next/cache"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { updateDevelopmentTemplateSchema } from "../schemas/development-template-schema"
import { updateDevelopmentTemplate } from "../services/update-development-template"

export async function updateDevelopmentTemplateAction(
  templateId: string,
  values: unknown
) {
  const parsed =
    updateDevelopmentTemplateSchema.safeParse(values)

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
    await updateDevelopmentTemplate({
      companyId,
      templateId,
      input: parsed.data,
    })
  } catch {
    return {
      success: false,
      message:
        "Não foi possível atualizar o template de desenvolvimento.",
    }
  }

  revalidatePath("/app/development")
  revalidatePath("/app/development/templates")

  return {
    success: true,
    message:
      "Template de desenvolvimento atualizado com sucesso.",
  }
}

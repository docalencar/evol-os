"use server"

import { revalidatePath } from "next/cache"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { deactivateDevelopmentTemplate } from "../services/deactivate-development-template"

export async function deactivateDevelopmentTemplateAction(
  templateId: string
) {
  const { companyId } =
    await getCurrentCompanyContext()

  try {
    await deactivateDevelopmentTemplate({
      companyId,
      templateId,
    })
  } catch {
    return {
      success: false,
      message:
        "Não foi possível desativar o template de desenvolvimento.",
    }
  }

  revalidatePath("/app/development")
  revalidatePath("/app/development/templates")

  return {
    success: true,
    message:
      "Template de desenvolvimento desativado com sucesso.",
  }
}
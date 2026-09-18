"use server"

import { revalidatePath } from "next/cache"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { obsoleteDevelopmentTemplate } from "../services/deactivate-development-template"
import { developmentTemplateAuthoringMessage } from "./development-template-authoring-message"

/**
 * The lifecycle operation is published -> obsolete. The published version is
 * resolved server-side from the container the caller names; there is no path
 * back from obsolete.
 */
export async function obsoleteDevelopmentTemplateAction(
  templateId: string
) {
  const { companyId } =
    await getCurrentCompanyContext()

  try {
    await obsoleteDevelopmentTemplate({
      companyId,
      templateId,
    })
  } catch (error) {
    return {
      success: false,
      message: developmentTemplateAuthoringMessage(
        error,
        "Não foi possível tornar o template obsoleto."
      ),
    }
  }

  revalidatePath("/app/development")
  revalidatePath("/app/development/templates")
  revalidatePath(`/app/development/templates/${templateId}`)

  return {
    success: true,
    message:
      "Template marcado como obsoleto com sucesso.",
  }
}
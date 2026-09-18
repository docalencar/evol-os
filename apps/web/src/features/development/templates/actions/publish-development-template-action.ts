"use server"

import { revalidatePath } from "next/cache"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { publishDevelopmentTemplateVersion } from "../services/publish-development-template-version"
import { developmentTemplateAuthoringMessage } from "./development-template-authoring-message"

/**
 * draft -> published. The container id is a selector; company, actor and the
 * version being published are all derived server-side, and the trusted function
 * refuses anyone who is not owner, admin or hr regardless of what the browser
 * managed to render.
 */
export async function publishDevelopmentTemplateAction(templateId: string) {
  const { companyId } = await getCurrentCompanyContext()

  try {
    await publishDevelopmentTemplateVersion({ companyId, templateId })
  } catch (error) {
    return {
      success: false,
      message: developmentTemplateAuthoringMessage(
        error,
        "Não foi possível publicar esta versão do template."
      ),
    }
  }

  revalidatePath("/app/development")
  revalidatePath("/app/development/templates")
  revalidatePath(`/app/development/templates/${templateId}`)

  return {
    success: true,
    message: "Versão publicada com sucesso.",
  }
}

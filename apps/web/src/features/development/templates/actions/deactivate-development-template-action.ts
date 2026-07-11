"use server"

import { revalidatePath } from "next/cache"

import {
  deactivateDevelopmentTemplate,
} from "../services/deactivate-development-template"

type DeactivateDevelopmentTemplateActionParams = {
  companyId: string
  templateId: string
}

export async function deactivateDevelopmentTemplateAction({
  companyId,
  templateId,
}: DeactivateDevelopmentTemplateActionParams) {
  await deactivateDevelopmentTemplate({
    companyId,
    templateId,
  })

  revalidatePath("/app/development")
}

"use server"

import { revalidatePath } from "next/cache"

import {
  updateDevelopmentTemplateSchema,
} from "../schemas/development-template-schema"

import {
  updateDevelopmentTemplate,
} from "../services/update-development-template"

type UpdateDevelopmentTemplateActionParams = {
  companyId: string
  templateId: string
  values: unknown
}

export async function updateDevelopmentTemplateAction({
  companyId,
  templateId,
  values,
}: UpdateDevelopmentTemplateActionParams) {
  const input =
    updateDevelopmentTemplateSchema.parse(values)

  await updateDevelopmentTemplate({
    companyId,
    templateId,
    input,
  })

  revalidatePath("/app/development")
}

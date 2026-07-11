"use server"

import { revalidatePath } from "next/cache"

import {
  createDevelopmentTemplateSchema,
} from "../schemas/development-template-schema"

import {
  createDevelopmentTemplate,
} from "../services/create-development-template"

type CreateDevelopmentTemplateActionParams = {
  companyId: string
  createdBy: string
  values: unknown
}

export async function createDevelopmentTemplateAction({
  companyId,
  createdBy,
  values,
}: CreateDevelopmentTemplateActionParams) {
  const input =
    createDevelopmentTemplateSchema.parse(values)

  await createDevelopmentTemplate({
    companyId,
    createdBy,
    input,
  })

  revalidatePath("/app/development")
}
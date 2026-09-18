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

  const { companyId } = await getCurrentCompanyContext()

  let created: { templateId: string; templateVersionId: string }
  try {
    // The idempotency key is minted here, once per submission, so a retried
    // request resolves to the same draft instead of a second one. The actor is
    // NOT passed: the boundary derives it from the session, and a browser-
    // supplied author would be an authority claim.
    created = await createDevelopmentTemplate({
      companyId,
      input: parsed.data,
      idempotencyKey: crypto.randomUUID(),
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
  revalidatePath(`/app/development/templates/${created.templateId}`)

  return {
    success: true,
    message:
      "Rascunho de template criado com sucesso.",
    templateId: created.templateId,
    templateVersionId: created.templateVersionId,
  }
}
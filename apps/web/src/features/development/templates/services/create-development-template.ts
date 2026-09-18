import "server-only"

import { createDevelopmentTemplateAuthoringRepository } from "../repositories/development-template-authoring-repository"
import { getDevelopmentTemplateAuthoringVersions } from "../queries/resolve-development-template-authoring-version"
import type { CreateDevelopmentTemplateInput } from "../schemas/development-template-schema"

type CreateDevelopmentTemplateParams = {
  companyId: string
  input: CreateDevelopmentTemplateInput
  idempotencyKey: string
}

/**
 * Creates a template DRAFT. The boundary creates the container and its first
 * version together and returns the version id; the container id is then read
 * back rather than predicted, because the route the caller navigates to is
 * keyed on the container and guessing it from submitted values would be an
 * assumption about what the database did.
 */
export async function createDevelopmentTemplate({
  companyId,
  input,
  idempotencyKey,
}: CreateDevelopmentTemplateParams): Promise<{
  templateId: string
  templateVersionId: string
}> {
  const repository = await createDevelopmentTemplateAuthoringRepository()
  const { templateVersionId } = await repository.createDraft({
    companyId,
    name: input.name,
    description: input.description ?? null,
    suggestedDurationDays: input.suggestedDurationDays ?? null,
    idempotencyKey,
  })

  // Read back rather than predict: the authoring read is the only authorized
  // way from a version to its container, and a caller who could not author
  // cannot resolve one.
  const versions = await getDevelopmentTemplateAuthoringVersions(companyId)
  const created = versions.find((version) => version.templateVersionId === templateVersionId)
  if (!created) throw new Error("DEVELOPMENT_TEMPLATE_DRAFT_NOT_READABLE")

  return { templateId: created.templateId, templateVersionId }
}

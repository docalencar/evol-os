import "server-only"

import { createDevelopmentTemplateAuthoringRepository } from "../repositories/development-template-authoring-repository"
import { resolvePublishedDevelopmentTemplateVersion } from "../queries/resolve-development-template-authoring-version"

type ObsoleteDevelopmentTemplateParams = {
  companyId: string
  templateId: string
}

/**
 * Retires a template by making its PUBLISHED version obsolete.
 *
 * The legacy operation flipped `development_templates.active`, which is now
 * compatibility state maintained by the boundary rather than something the
 * application sets. The lifecycle operation is published → obsolete, and it
 * acts on the published version — resolved here, never taken from the client,
 * because the container id the route carries does not identify a version.
 *
 * There is no path back: obsolete → published does not exist.
 */
export async function obsoleteDevelopmentTemplate({
  companyId,
  templateId,
}: ObsoleteDevelopmentTemplateParams): Promise<void> {
  const published = await resolvePublishedDevelopmentTemplateVersion(companyId, templateId)
  if (!published) throw new Error("DEVELOPMENT_TEMPLATE_NO_PUBLISHED_VERSION")

  const repository = await createDevelopmentTemplateAuthoringRepository()
  await repository.obsolete(published.templateVersionId)
}

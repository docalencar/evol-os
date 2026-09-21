import "server-only"

import { createDevelopmentTemplateAuthoringRepository } from "../repositories/development-template-authoring-repository"
import { resolveDevelopmentTemplateAuthoringVersion } from "../queries/resolve-development-template-authoring-version"

type PublishDevelopmentTemplateVersionParams = {
  companyId: string
  templateId: string
}

/**
 * Publishes the container's current DRAFT version.
 *
 * Both the version and its revision are resolved here, from the authoring read,
 * rather than accepted from the caller. The revision matters: every goal and
 * action added to a draft bumps it, so passing the value the server just read
 * is what makes `publish_development_template_version_v1` refuse a stale page
 * that would otherwise publish a draft different from the one its author saw.
 *
 * Whether the draft is complete enough to publish is the database's decision,
 * not this function's — 0131 requires at least one goal and an action on every
 * goal, and duplicating that rule here would create a second authority that
 * could drift.
 */
export async function publishDevelopmentTemplateVersion({
  companyId,
  templateId,
}: PublishDevelopmentTemplateVersionParams): Promise<{ templateVersionId: string }> {
  const version = await resolveDevelopmentTemplateAuthoringVersion(companyId, templateId)
  if (!version) throw new Error("DEVELOPMENT_TEMPLATE_NOT_AVAILABLE")
  if (version.status !== "draft") throw new Error("DEVELOPMENT_TEMPLATE_VERSION_NOT_EDITABLE")

  const repository = await createDevelopmentTemplateAuthoringRepository()
  await repository.publish(version.templateVersionId, version.revision)
  return { templateVersionId: version.templateVersionId }
}

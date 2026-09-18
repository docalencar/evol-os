import "server-only"

import { createDevelopmentTemplateAuthoringRepository } from "../repositories/development-template-authoring-repository"
import { getDevelopmentTemplateVersionContent } from "../queries/get-development-template-version-content"
import { resolveDevelopmentTemplateAuthoringVersion } from "../queries/resolve-development-template-authoring-version"

type CreateDevelopmentTemplateGoalParams = {
  companyId: string
  templateId: string
  competencyId: string
  suggestedTargetLevel: number
}

/**
 * Adds a competency to the container's current DRAFT version.
 *
 * The version is resolved server-side from the container the route names — the
 * browser never chooses which version it writes into. A container whose newest
 * version is published or obsolete is refused here rather than at the database,
 * so the caller gets the lifecycle reason instead of a constraint code.
 */
export async function createDevelopmentTemplateGoal({
  companyId,
  templateId,
  competencyId,
  suggestedTargetLevel,
}: CreateDevelopmentTemplateGoalParams): Promise<{ templateVersionGoalId: string }> {
  const version = await resolveDevelopmentTemplateAuthoringVersion(companyId, templateId)
  if (!version) throw new Error("DEVELOPMENT_TEMPLATE_NOT_AVAILABLE")
  if (version.status !== "draft") throw new Error("DEVELOPMENT_TEMPLATE_VERSION_NOT_EDITABLE")

  // Append: order is the count of what is already there, so the boundary's
  // (order_index, created_at, id) ordering stays stable and deterministic.
  const { goals } = await getDevelopmentTemplateVersionContent(version.templateVersionId)

  const repository = await createDevelopmentTemplateAuthoringRepository()
  return repository.addGoal({
    templateVersionId: version.templateVersionId,
    competencyId,
    suggestedTargetLevel,
    orderIndex: goals.length,
  })
}

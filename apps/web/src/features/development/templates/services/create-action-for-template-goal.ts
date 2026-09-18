import "server-only"

import { createDevelopmentTemplateAuthoringRepository } from "../repositories/development-template-authoring-repository"
import { getDevelopmentTemplateVersionContent } from "../queries/get-development-template-version-content"
import { resolveDevelopmentTemplateAuthoringVersion } from "../queries/resolve-development-template-authoring-version"

type CreateActionForTemplateGoalParams = {
  companyId: string
  templateId: string
  templateVersionGoalId: string
  title: string
  description?: string
  type: string
  suggestedDueDays?: number
}

/**
 * Adds an action to a goal of the container's current DRAFT version.
 *
 * `templateVersionGoalId` is a goal of the version model — never a legacy
 * template goal id, never a competency id. It is validated against the version
 * the container actually resolves to, so a stale page cannot post a goal id
 * belonging to some other version.
 */
export async function createActionForTemplateGoal({
  companyId,
  templateId,
  templateVersionGoalId,
  title,
  description,
  type,
  suggestedDueDays,
}: CreateActionForTemplateGoalParams): Promise<{ templateVersionActionId: string }> {
  const version = await resolveDevelopmentTemplateAuthoringVersion(companyId, templateId)
  if (!version) throw new Error("DEVELOPMENT_TEMPLATE_NOT_AVAILABLE")
  if (version.status !== "draft") throw new Error("DEVELOPMENT_TEMPLATE_VERSION_NOT_EDITABLE")

  const { goals, actions } = await getDevelopmentTemplateVersionContent(version.templateVersionId)
  const goal = goals.find((candidate) => candidate.templateVersionGoalId === templateVersionGoalId)
  if (!goal) throw new Error("DEVELOPMENT_TEMPLATE_GOAL_NOT_AVAILABLE")

  const siblings = actions.filter(
    (action) => action.templateVersionGoalId === templateVersionGoalId
  )

  const repository = await createDevelopmentTemplateAuthoringRepository()
  return repository.addAction({
    templateVersionGoalId,
    title,
    description: description ?? null,
    type,
    suggestedDueDays: suggestedDueDays ?? null,
    orderIndex: siblings.length,
  })
}

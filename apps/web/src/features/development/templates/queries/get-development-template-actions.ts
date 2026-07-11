import { getDevelopmentTemplateActions as getDevelopmentTemplateActionsService } from "../services/get-development-template-actions"

export async function getDevelopmentTemplateActions(
  templateGoalId: string
) {
  return getDevelopmentTemplateActionsService(
    templateGoalId
  )
}
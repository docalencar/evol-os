import { getDevelopmentTemplateGoals as getDevelopmentTemplateGoalsService } from "../services/get-development-template-goals"

export async function getDevelopmentTemplateGoals(
  templateId: string
) {
  return getDevelopmentTemplateGoalsService(
    templateId
  )
}
import { getDevelopmentTemplates as getDevelopmentTemplatesService } from "../services/get-development-templates"

export async function getDevelopmentTemplates(
  companyId: string
) {
  return getDevelopmentTemplatesService(companyId)
}
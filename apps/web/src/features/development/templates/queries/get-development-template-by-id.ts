import { getDevelopmentTemplateById as getDevelopmentTemplateByIdService } from "../services/get-development-template-by-id"

export async function getDevelopmentTemplateById(
  companyId: string,
  templateId: string
) {
  return getDevelopmentTemplateByIdService(
    companyId,
    templateId
  )
}
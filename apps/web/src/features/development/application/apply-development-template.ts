import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { applyDevelopmentTemplateV2 } from "./apply-development-template-v2"
import { createLegacyDevelopmentTemplateApplicationAdapter } from "./legacy-development-template-application-adapter"

export type ApplyDevelopmentTemplateInput = {
  employeeId: string
  templateId: string
  ownerId?: string
  priority: "low" | "medium" | "high"
  startDate?: string
  dueDate?: string
}

export async function applyDevelopmentTemplate(
  input: ApplyDevelopmentTemplateInput
) {
  const {
    supabase,
    companyId,
  } = await getCurrentCompanyContext()

  const adapter = createLegacyDevelopmentTemplateApplicationAdapter({
    async findPublishedTemplateVersionId(templateId) {
      const { data, error } = await supabase
        .from("development_template_versions")
        .select("id")
        .eq("template_id", templateId)
        .eq("company_id", companyId)
        .eq("status", "published")
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error("DEVELOPMENT_TEMPLATE_VERSION_NOT_CONSUMABLE")
      return data.id
    },
    apply: applyDevelopmentTemplateV2,
    createId: () => crypto.randomUUID(),
    now: () => new Date(),
  })

  return adapter(input)
}

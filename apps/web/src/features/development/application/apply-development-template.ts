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
    // Summary metadata only: this step answers "which published version of this
    // container is consumable here?", so it uses the catalog boundary rather
    // than the resolver's content read. 0131 closed the direct select that used
    // to stand here, and widening the resolver read to serve a lookup would
    // turn an internal engine API into a product read API.
    async findPublishedTemplateVersionId(templateId) {
      const { data, error } = await supabase.rpc(
        "get_published_development_template_catalog_v1",
        { p_company_id: companyId },
      )
      if (error) throw error
      const consumable = ((data ?? []) as Array<{ id: string; template_id: string }>).filter(
        (version) => version.template_id === templateId,
      )
      if (consumable.length === 0) {
        throw new Error("DEVELOPMENT_TEMPLATE_VERSION_NOT_CONSUMABLE")
      }
      // The catalog orders by version_number descending within a template, so
      // the first consumable row is the newest published one.
      return consumable[0].id
    },
    apply: applyDevelopmentTemplateV2,
    createId: () => crypto.randomUUID(),
    now: () => new Date(),
  })

  return adapter(input)
}

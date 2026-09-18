import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

/**
 * Which published version of this template container is consumable here?
 *
 * Readiness and eligibility need the identifier and nothing else, so this asks
 * the published catalog boundary rather than the resolver's content read. 0131
 * revoked the direct select that used to stand here; reaching for the content
 * boundary instead would hand a summary caller the full goal and action set it
 * has no need for, and would turn an internal engine API into a product read.
 */
export async function getPublishedDevelopmentTemplateVersionId(
  templateId: string,
): Promise<string> {
  const { supabase, companyId } = await getCurrentCompanyContext()
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

  // The catalog orders by version_number descending within a template, so the
  // first consumable row is the newest published one.
  return consumable[0].id
}

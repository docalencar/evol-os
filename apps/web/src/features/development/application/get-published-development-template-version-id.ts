import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export async function getPublishedDevelopmentTemplateVersionId(
  templateId: string,
): Promise<string> {
  const { supabase, companyId } = await getCurrentCompanyContext()
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
}

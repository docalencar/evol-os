import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

/**
 * Published templates any active member of the tenant may see.
 *
 * This is the CATALOG boundary, deliberately separate from the authoring read:
 * seeing that a published template exists — in order to apply it, or to read a
 * plan that was built from it — is not the same capability as administering
 * templates. Drafts never appear here, and neither does anything a company may
 * not consume.
 */

export type PublishedDevelopmentTemplate = Readonly<{
  templateId: string
  templateVersionId: string
  versionNumber: number
  name: string
  description: string | null
  suggestedDurationDays: number | null
}>

type CatalogRow = {
  id: string
  template_id: string
  version_number: number
  name: string
  description: string | null
  suggested_duration_days: number | null
}

export async function getPublishedDevelopmentTemplateCatalog(
  companyId: string
): Promise<PublishedDevelopmentTemplate[]> {
  const database = await createServerDatabase()
  const { data, error } = await database.rpc(
    "get_published_development_template_catalog_v1",
    { p_company_id: companyId }
  )
  if (error) throw error

  return ((data ?? []) as CatalogRow[]).map((row) => ({
    templateId: row.template_id,
    templateVersionId: row.id,
    versionNumber: row.version_number,
    name: row.name,
    description: row.description,
    suggestedDurationDays: row.suggested_duration_days,
  }))
}

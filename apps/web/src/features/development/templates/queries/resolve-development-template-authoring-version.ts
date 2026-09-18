import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

/**
 * Container identity in, version identity out.
 *
 * The authoring route is keyed on the legacy container (`templateId`) and the
 * trusted boundary is keyed on the version (`templateVersionId`). Something has
 * to bridge those, and it is deliberately the server: a browser that could name
 * the version it wants to write into would be supplying authority, and 0131
 * revoked the direct reads that would let it discover one anyway.
 *
 * `get_development_template_authoring_v1` returns the company's own version
 * rows for administrative actors only, newest first. A manager or employee gets
 * an empty set here, which is the same answer they get for a container that
 * does not exist — the boundary never confirms existence to someone who may not
 * author.
 */

export type DevelopmentTemplateAuthoringVersion = Readonly<{
  templateId: string
  templateVersionId: string
  versionNumber: number
  status: "draft" | "published" | "obsolete"
  revision: number
  name: string
  description: string | null
  suggestedDurationDays: number | null
}>

type AuthoringVersionRow = {
  id: string
  template_id: string
  version_number: number
  status: DevelopmentTemplateAuthoringVersion["status"]
  revision: number
  name: string
  description: string | null
  suggested_duration_days: number | null
}

async function readAuthoringVersions(
  companyId: string
): Promise<AuthoringVersionRow[]> {
  const database = await createServerDatabase()
  const { data, error } = await database.rpc("get_development_template_authoring_v1", {
    p_company_id: companyId,
  })
  if (error) throw error
  return (data ?? []) as AuthoringVersionRow[]
}

function toAuthoringVersion(row: AuthoringVersionRow): DevelopmentTemplateAuthoringVersion {
  return {
    templateId: row.template_id,
    templateVersionId: row.id,
    versionNumber: row.version_number,
    status: row.status,
    revision: row.revision,
    name: row.name,
    description: row.description,
    suggestedDurationDays: row.suggested_duration_days,
  }
}

/** Every authoring version this administrative actor may see, newest first. */
export async function getDevelopmentTemplateAuthoringVersions(
  companyId: string
): Promise<DevelopmentTemplateAuthoringVersion[]> {
  const rows = await readAuthoringVersions(companyId)
  return rows
    .sort((left, right) => right.version_number - left.version_number)
    .map(toAuthoringVersion)
}

/**
 * The version the authoring surface is currently about: the highest-numbered
 * one belonging to this container. `null` when the caller may not author, or
 * when the container has no version — both opaque, both handled the same way.
 */
export async function resolveDevelopmentTemplateAuthoringVersion(
  companyId: string,
  templateId: string
): Promise<DevelopmentTemplateAuthoringVersion | null> {
  const rows = await readAuthoringVersions(companyId)
  const owned = rows
    .filter((row) => row.template_id === templateId)
    .sort((left, right) => right.version_number - left.version_number)
  return owned.length > 0 ? toAuthoringVersion(owned[0]) : null
}

/**
 * The published version of a container, which is what `obsolete` acts on.
 * Separate from the function above because "newest" and "published" are
 * different questions: a container may carry a newer draft while its published
 * version is the one still in use.
 */
export async function resolvePublishedDevelopmentTemplateVersion(
  companyId: string,
  templateId: string
): Promise<DevelopmentTemplateAuthoringVersion | null> {
  const rows = await readAuthoringVersions(companyId)
  const published = rows
    .filter((row) => row.template_id === templateId && row.status === "published")
    .sort((left, right) => right.version_number - left.version_number)
  return published.length > 0 ? toAuthoringVersion(published[0]) : null
}

import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

/**
 * Which template version produced a Development plan.
 *
 * This is HISTORICAL provenance, and it is the only correct source for the
 * "Template de origem" field. The current catalog cannot answer it: obsoleting a
 * template, or publishing a newer version of it, must not change what an existing
 * plan records about where it came from.
 *
 * `get_authorized_development_plan_origins_v1` (0133) reads the immutable
 * application lineage and snapshot — trigger-protected against UPDATE and DELETE,
 * and verified field-for-field against the live version row at application time.
 * It deliberately does NOT consult `development_plans.template_id`, which migration
 * 0011 declared `on delete set null` and which the database is therefore willing to
 * forget.
 *
 * AUTHORIZATION IS THE DATABASE'S. The boundary applies
 * `can_read_development_plan_v1` per returned row, so origin visibility follows
 * plan visibility exactly — subject, current manager, active operational owner,
 * owner/admin/hr — and nothing here re-derives that matrix. It is also strictly
 * narrower than the inherited tenant-wide RLS on the ledger tables themselves.
 *
 * ABSENCE IS NOT AN ORACLE. A plan built without a template, a plan the caller may
 * not read, and a plan that does not exist all return no row. Callers must render
 * absence as absence and never fabricate a name.
 *
 * Set-based by default: omit `planId` to get every origin the caller is entitled
 * to in one round trip, which is what keeps plan-list decoration off an N+1 path.
 */

export type DevelopmentPlanOrigin = Readonly<{
  planId: string
  templateId: string
  templateVersionId: string
  templateName: string
  templateVersionNumber: number
}>

/** Exactly the five columns 0133 returns. */
type DevelopmentPlanOriginRow = {
  plan_id: string
  template_id: string
  template_version_id: string
  template_name: string
  template_version_number: number
}

export async function getDevelopmentPlanOrigins(
  companyId: string,
  planId?: string | null
): Promise<DevelopmentPlanOrigin[]> {
  const database = await createServerDatabase()

  const { data, error } = await database.rpc(
    "get_authorized_development_plan_origins_v1",
    {
      p_company_id: companyId,
      p_plan_id: planId ?? null,
    }
  )
  if (error) throw error

  return ((data ?? []) as DevelopmentPlanOriginRow[]).map((row) => ({
    planId: row.plan_id,
    templateId: row.template_id,
    templateVersionId: row.template_version_id,
    templateName: row.template_name,
    templateVersionNumber: row.template_version_number,
  }))
}

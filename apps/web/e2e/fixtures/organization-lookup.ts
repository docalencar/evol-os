/**
 * Read-back of organization entities the JOURNEY created — RUNNER ONLY.
 *
 * This module creates nothing. Specs 05 and 06 build the department, position,
 * team and person through the real UI; all that happens here is that the runner
 * reads the resulting ids so a later spec can aim a direct-URL boundary test at
 * a real foreign resource.
 *
 * Supplying a target id is not the same as proving anything about access. The
 * isolation assertions in spec 07 run entirely through an authenticated browser
 * session, which never sees this client — a denial demonstrated with a
 * service-role client would prove nothing about what a user can reach.
 *
 * ## Why nothing here is journalled
 *
 * Every entity below is `company_id references companies(id) on delete cascade`,
 * and the owning company is already journalled as a full UUID. Ownership is
 * therefore already complete: physical cleanup removes them with the company, and
 * retirement targets people by company for exactly the same reason. Recording
 * them again would create a second ownership system with nothing to add.
 */

import { adminClient } from "../helpers/admin-client"

/**
 * Resolve one run-created entity by its company and its exact synthetic name.
 *
 * Both halves of the predicate matter: the company id is a journalled full UUID,
 * and the name is run-scoped, so this can never resolve pre-existing Review data
 * and never needs a wildcard.
 */
async function findByName(
  table: "departments" | "positions" | "teams" | "people",
  companyId: string,
  column: "name" | "full_name",
  value: string,
): Promise<string> {
  const { data, error } = await adminClient()
    .from(table)
    .select("id")
    .eq("company_id", companyId)
    .eq(column, value)
    .maybeSingle()

  if (error) {
    throw new Error(`E2E_ORG_LOOKUP_FAILED (${table} "${value}"): ${error.message}`)
  }
  if (!data?.id) {
    throw new Error(
      `E2E_ORG_LOOKUP_MISSING: no ${table} named "${value}" in company ${companyId}. ` +
        `The UI journey did not create it.`,
    )
  }
  return data.id as string
}

export function departmentId(companyId: string, name: string): Promise<string> {
  return findByName("departments", companyId, "name", name)
}

export function positionId(companyId: string, name: string): Promise<string> {
  return findByName("positions", companyId, "name", name)
}

export function teamId(companyId: string, name: string): Promise<string> {
  return findByName("teams", companyId, "name", name)
}

export function personId(companyId: string, fullName: string): Promise<string> {
  return findByName("people", companyId, "full_name", fullName)
}

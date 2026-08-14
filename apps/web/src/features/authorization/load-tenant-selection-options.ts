import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

// MVP-PR1 Phase 7 (PR 7D). Auth-only loader for the safe tenant-selection state.
// It lists ONLY the authenticated user's own active memberships (self-only via
// RLS) and NEVER resolves/chooses a tenant. It does not read the tenant
// preference and never derives authority from it.
export type TenantSelectionOption = Readonly<{
  companyId: string
  companyName: string
}>

export type TenantSelectionOptions =
  | Readonly<{ status: "no_membership" }>
  | Readonly<{ status: "single"; companyId: string }>
  | Readonly<{ status: "options"; options: readonly TenantSelectionOption[] }>

type MembershipWithCompany = Readonly<{
  company_id: string
  status: string
  companies: unknown
}>

function companyNameOf(row: MembershipWithCompany): string {
  const related = row.companies
  if (Array.isArray(related)) {
    const first = related[0] as { name?: unknown } | undefined
    return typeof first?.name === "string" ? first.name : row.company_id
  }
  if (related && typeof related === "object" && typeof (related as { name?: unknown }).name === "string") {
    return (related as { name: string }).name
  }
  return row.company_id
}

export async function loadTenantSelectionOptions(
  supabase: SupabaseClient,
  userId: string,
): Promise<TenantSelectionOptions> {
  const { data, error } = await supabase
    .from("company_members")
    .select("company_id, status, companies(name)")
    .eq("user_id", userId)

  if (error) {
    // Fail-closed: never fabricate options on a read error.
    return { status: "no_membership" }
  }

  const active = ((data ?? []) as MembershipWithCompany[]).filter(
    (row) => row.status === "active",
  )

  if (active.length === 0) {
    return { status: "no_membership" }
  }
  if (active.length === 1) {
    return { status: "single", companyId: active[0].company_id }
  }

  const options = active
    .map((row) => ({ companyId: row.company_id, companyName: companyNameOf(row) }))
    .sort((left, right) =>
      left.companyId < right.companyId ? -1 : left.companyId > right.companyId ? 1 : 0,
    )

  return { status: "options", options }
}

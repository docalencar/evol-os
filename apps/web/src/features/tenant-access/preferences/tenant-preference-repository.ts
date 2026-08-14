import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

export type TenantPreference = Readonly<{ preferredCompanyId: string | null }>

// MVP-PR1 Phase 7 (PR 7B). Reads the authenticated user's active-tenant
// preference. Self-only via RLS (the table grants SELECT to authenticated and
// the policy restricts rows to auth.uid()); the userId is passed explicitly for
// clarity/defense-in-depth. Fail-closed: any error yields no preference, so the
// resolver falls back to explicit selection.
//
// DORMANT in 7B: no production consumer calls this yet. PR 7C wires it into the
// tenant resolution context behind a feature flag.
export async function readActiveTenantPreference(
  supabase: SupabaseClient,
  userId: string,
): Promise<TenantPreference> {
  const { data, error } = await supabase
    .from("tenant_membership_preferences")
    .select("preferred_company_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    return { preferredCompanyId: null }
  }

  const preferredCompanyId =
    typeof data?.preferred_company_id === "string" ? data.preferred_company_id : null
  return { preferredCompanyId }
}

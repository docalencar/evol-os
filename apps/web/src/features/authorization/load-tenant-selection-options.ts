import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { loadCurrentUserActiveTenants } from "./current-user-active-tenants"

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

export async function loadTenantSelectionOptions(
  supabase: SupabaseClient,
): Promise<TenantSelectionOptions> {
  let activeTenants
  try {
    activeTenants = await loadCurrentUserActiveTenants(supabase)
  } catch {
    // Fail-closed: never fabricate options on a read error.
    return { status: "no_membership" }
  }

  if (activeTenants.length === 0) {
    return { status: "no_membership" }
  }
  if (activeTenants.length === 1) {
    return { status: "single", companyId: activeTenants[0].companyId }
  }

  const options = activeTenants.map((tenant) => ({
    companyId: tenant.companyId,
    companyName: tenant.companyName,
  }))

  return { status: "options", options }
}

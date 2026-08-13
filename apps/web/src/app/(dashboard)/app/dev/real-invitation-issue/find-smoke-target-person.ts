import "server-only"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

// TEMPORARY — MVP-PR1 Phase 6 real acceptance smoke ONLY.
// Server-only, tenant-scoped lookup of the single eligible smoke target People.
// The browser provides nothing: the tenant is server-derived, the target email
// is a fixed server constant, and role/authority are never client-supplied.
export const SMOKE_TARGET_EMAIL = "galileu_ga@hotmail.com"

export type SmokeTargetResult =
  | Readonly<{ status: "eligible"; personId: string }>
  | Readonly<{ status: "not_prepared" }>
  | Readonly<{ status: "ambiguous" }>
  | Readonly<{ status: "unauthorized" }>

export async function findSmokeTargetPerson(): Promise<SmokeTargetResult> {
  const { companyId, currentUser, supabase } = await getCurrentCompanyContext()

  if (currentUser.role !== "owner" && currentUser.role !== "admin") {
    return { status: "unauthorized" }
  }

  const { data, error } = await supabase
    .from("people")
    .select("id, email")
    .eq("company_id", companyId)
    .eq("status", "active")
    .is("user_id", null)

  if (error) return { status: "not_prepared" }

  // Exact (normalized) email match, done in memory to avoid ILIKE wildcard
  // semantics ("_" in the address). Require exactly one candidate.
  const matches = (data ?? []).filter(
    (person) => person.email?.trim().toLowerCase() === SMOKE_TARGET_EMAIL,
  )

  if (matches.length === 0) return { status: "not_prepared" }
  if (matches.length > 1) return { status: "ambiguous" }
  return { status: "eligible", personId: matches[0].id }
}

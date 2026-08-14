import assert from "node:assert/strict"
import test from "node:test"

import type { SupabaseClient, User } from "@supabase/supabase-js"

import { CurrentUserContextError, loadCurrentUserContext } from "./current-user-context"

type MembershipRow = Readonly<{
  company_id: string
  role: string
  status: "active" | "inactive" | "invited"
}>

function createSupabase(rows: readonly MembershipRow[]): SupabaseClient {
  const query = {
    select: () => query,
    eq: () => query,
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve),
  }
  return { from: () => query } as unknown as SupabaseClient
}

const user = { id: "user-1" } as User

const singleActive: readonly MembershipRow[] = [
  { company_id: "company-a", role: "owner", status: "active" },
]
const multiActive: readonly MembershipRow[] = [
  { company_id: "company-a", role: "owner", status: "active" },
  { company_id: "company-b", role: "admin", status: "active" },
]
const multiWithInactive: readonly MembershipRow[] = [
  { company_id: "company-a", role: "owner", status: "active" },
  { company_id: "company-b", role: "admin", status: "active" },
  { company_id: "company-c", role: "employee", status: "inactive" },
]

// --- single-tenant parity (flag OFF == flag ON) ----------------------------

test("single active membership resolves identically with and without a preference", async () => {
  const withoutPreference = await loadCurrentUserContext(createSupabase(singleActive), user)
  const withPreference = await loadCurrentUserContext(createSupabase(singleActive), user, "company-a")
  const withForeignPreference = await loadCurrentUserContext(createSupabase(singleActive), user, "company-zzz")
  assert.deepEqual(withoutPreference, { userId: "user-1", companyId: "company-a", role: "owner" })
  assert.deepEqual(withPreference, withoutPreference)
  assert.deepEqual(withForeignPreference, withoutPreference)
})

// --- multi-tenant behavior --------------------------------------------------

test("multiple active memberships without a preference still require selection", async () => {
  await assert.rejects(
    loadCurrentUserContext(createSupabase(multiActive), user),
    (error: unknown) =>
      error instanceof CurrentUserContextError && error.code === "tenant_selection_required",
  )
})

test("multiple active memberships with a valid preference resolve to it (preserving role)", async () => {
  const context = await loadCurrentUserContext(createSupabase(multiActive), user, "company-b")
  assert.deepEqual(context, { userId: "user-1", companyId: "company-b", role: "admin" })
})

test("a foreign preference (no active membership) requires selection", async () => {
  await assert.rejects(
    loadCurrentUserContext(createSupabase(multiActive), user, "company-foreign"),
    (error: unknown) =>
      error instanceof CurrentUserContextError && error.code === "tenant_selection_required",
  )
})

test("a preference pointing at an inactive membership requires selection", async () => {
  await assert.rejects(
    loadCurrentUserContext(createSupabase(multiWithInactive), user, "company-c"),
    (error: unknown) =>
      error instanceof CurrentUserContextError && error.code === "tenant_selection_required",
  )
})

// --- zero memberships parity ------------------------------------------------

test("no active membership yields membership_not_found regardless of preference", async () => {
  const rows: readonly MembershipRow[] = [{ company_id: "company-a", role: "owner", status: "inactive" }]
  for (const preferred of [undefined, "company-a", "company-foreign"]) {
    await assert.rejects(
      loadCurrentUserContext(createSupabase(rows), user, preferred as string | undefined),
      (error: unknown) =>
        error instanceof CurrentUserContextError && error.code === "membership_not_found",
    )
  }
})

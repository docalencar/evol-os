import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

import type { SupabaseClient, User } from "@supabase/supabase-js"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only"
      ? { shortCircuit: true, url: "server-only:test" }
      : nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    return url === "server-only:test"
      ? { format: "module", shortCircuit: true, source: "export {}" }
      : nextLoad(url, context)
  },
})

const loadModule = () => import("./current-user-context")

type ActiveTenantRow = Readonly<{
  company_id: string
  company_name: string
  membership_role: string
}>

function createSupabase(rows: readonly ActiveTenantRow[]): SupabaseClient {
  return {
    rpc: async () => ({ data: rows, error: null }),
  } as unknown as SupabaseClient
}

const user = { id: "user-1" } as User

const singleActive: readonly ActiveTenantRow[] = [
  { company_id: "company-a", company_name: "Alpha", membership_role: "owner" },
]
const multiActive: readonly ActiveTenantRow[] = [
  { company_id: "company-a", company_name: "Alpha", membership_role: "owner" },
  { company_id: "company-b", company_name: "Beta", membership_role: "admin" },
]

// --- single-tenant parity (flag OFF == flag ON) ----------------------------

test("single active membership resolves identically with and without a preference", async () => {
  const { loadCurrentUserContext } = await loadModule()
  const withoutPreference = await loadCurrentUserContext(createSupabase(singleActive), user)
  const withPreference = await loadCurrentUserContext(createSupabase(singleActive), user, "company-a")
  const withForeignPreference = await loadCurrentUserContext(createSupabase(singleActive), user, "company-zzz")
  assert.deepEqual(withoutPreference, { userId: "user-1", companyId: "company-a", role: "owner" })
  assert.deepEqual(withPreference, withoutPreference)
  assert.deepEqual(withForeignPreference, withoutPreference)
})

// --- multi-tenant behavior --------------------------------------------------

test("multiple active memberships without a preference still require selection", async () => {
  const { CurrentUserContextError, loadCurrentUserContext } = await loadModule()
  await assert.rejects(
    loadCurrentUserContext(createSupabase(multiActive), user),
    (error: unknown) =>
      error instanceof CurrentUserContextError && error.code === "tenant_selection_required",
  )
})

test("multiple active memberships with a valid preference resolve to it (preserving role)", async () => {
  const { loadCurrentUserContext } = await loadModule()
  const context = await loadCurrentUserContext(createSupabase(multiActive), user, "company-b")
  assert.deepEqual(context, { userId: "user-1", companyId: "company-b", role: "admin" })
})

test("a foreign preference (no active membership) requires selection", async () => {
  const { CurrentUserContextError, loadCurrentUserContext } = await loadModule()
  await assert.rejects(
    loadCurrentUserContext(createSupabase(multiActive), user, "company-foreign"),
    (error: unknown) =>
      error instanceof CurrentUserContextError && error.code === "tenant_selection_required",
  )
})

test("a preference pointing at an inactive membership requires selection", async () => {
  const { CurrentUserContextError, loadCurrentUserContext } = await loadModule()
  await assert.rejects(
    loadCurrentUserContext(createSupabase(multiActive), user, "company-c"),
    (error: unknown) =>
      error instanceof CurrentUserContextError && error.code === "tenant_selection_required",
  )
})

// --- zero memberships parity ------------------------------------------------

test("no active membership yields membership_not_found regardless of preference", async () => {
  const { CurrentUserContextError, loadCurrentUserContext } = await loadModule()
  const rows: readonly ActiveTenantRow[] = []
  for (const preferred of [undefined, "company-a", "company-foreign"]) {
    await assert.rejects(
      loadCurrentUserContext(createSupabase(rows), user, preferred as string | undefined),
      (error: unknown) =>
        error instanceof CurrentUserContextError && error.code === "membership_not_found",
    )
  }
})

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

const authenticatedUser = { id: "user-1" } as User

test("preserves the legacy single-tenant context", async () => {
  const { loadCurrentUserContext } = await loadModule()
  const context = await loadCurrentUserContext(
    createSupabase([
      { company_id: "company-a", company_name: "Alpha", membership_role: "owner" },
    ]),
    authenticatedUser
  )

  assert.deepEqual(context, {
    userId: "user-1",
    companyId: "company-a",
    companyName: "Alpha",
    role: "owner",
  })
})

test("fails closed when the user has no active membership", async () => {
  const { CurrentUserContextError, loadCurrentUserContext } = await loadModule()
  await assert.rejects(
    loadCurrentUserContext(createSupabase([]), authenticatedUser),
    (error) =>
      error instanceof CurrentUserContextError &&
      error.code === "membership_not_found"
  )
})

test("fails closed instead of choosing an arbitrary tenant", async () => {
  const { CurrentUserContextError, loadCurrentUserContext } = await loadModule()
  await assert.rejects(
    loadCurrentUserContext(
      createSupabase([
        { company_id: "company-a", company_name: "Alpha", membership_role: "owner" },
        { company_id: "company-b", company_name: "Beta", membership_role: "admin" },
      ]),
      authenticatedUser
    ),
    (error) =>
      error instanceof CurrentUserContextError &&
      error.code === "tenant_selection_required"
  )
})

test("fails closed when an active membership has an invalid role", async () => {
  const { CurrentUserContextError, loadCurrentUserContext } = await loadModule()
  await assert.rejects(
    loadCurrentUserContext(
      createSupabase([
        { company_id: "company-a", company_name: "Alpha", membership_role: "unknown" },
      ]),
      authenticatedUser
    ),
    (error) =>
      error instanceof CurrentUserContextError && error.code === "invalid_role"
  )
})

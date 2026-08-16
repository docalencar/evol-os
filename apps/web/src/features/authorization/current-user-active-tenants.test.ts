import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

import type { SupabaseClient } from "@supabase/supabase-js"

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

const loadModule = () => import("./current-user-active-tenants")

function createSupabase(
  data: unknown,
  error: unknown = null,
  onRpc?: (name: string, params: unknown) => void,
): SupabaseClient {
  return {
    rpc: async (name: string, params?: unknown) => {
      onRpc?.(name, params)
      return { data, error }
    },
  } as unknown as SupabaseClient
}

test("loads, validates and deterministically normalizes active tenants through the RPC only", async () => {
  const { loadCurrentUserActiveTenants } = await loadModule()
  const calls: Array<readonly [string, unknown]> = []
  const result = await loadCurrentUserActiveTenants(
    createSupabase(
      [
        { company_id: "company-b", company_name: "Beta", membership_role: "admin" },
        { company_id: "company-a", company_name: "Alpha", membership_role: "owner" },
      ],
      null,
      (name, params) => calls.push([name, params]),
    ),
  )

  assert.deepEqual(calls, [["get_current_user_active_tenants_v1", undefined]])
  assert.deepEqual(result, [
    { companyId: "company-a", companyName: "Alpha", role: "owner" },
    { companyId: "company-b", companyName: "Beta", role: "admin" },
  ])
})

test("returns an empty collection for zero active memberships", async () => {
  const { loadCurrentUserActiveTenants } = await loadModule()
  assert.deepEqual(await loadCurrentUserActiveTenants(createSupabase([])), [])
})

test("fails closed without exposing a PostgREST read error", async () => {
  const {
    CurrentUserActiveTenantsError,
    loadCurrentUserActiveTenants,
  } = await loadModule()

  await assert.rejects(
    loadCurrentUserActiveTenants(
      createSupabase(null, { code: "42501", message: "sensitive database detail" }),
    ),
    (error: unknown) =>
      error instanceof CurrentUserActiveTenantsError &&
      error.code === "read_failed" &&
      !error.message.includes("sensitive"),
  )
})

test("fails closed when an active membership role is invalid", async () => {
  const {
    CurrentUserActiveTenantsError,
    loadCurrentUserActiveTenants,
  } = await loadModule()

  await assert.rejects(
    loadCurrentUserActiveTenants(
      createSupabase([
        { company_id: "company-a", company_name: "Alpha", membership_role: "invalid" },
      ]),
    ),
    (error: unknown) =>
      error instanceof CurrentUserActiveTenantsError && error.code === "invalid_role",
  )
})

test("rejects malformed rows instead of fabricating tenant context", async () => {
  const {
    CurrentUserActiveTenantsError,
    loadCurrentUserActiveTenants,
  } = await loadModule()

  await assert.rejects(
    loadCurrentUserActiveTenants(
      createSupabase([
        { company_id: "company-a", company_name: null, membership_role: "owner" },
      ]),
    ),
    (error: unknown) =>
      error instanceof CurrentUserActiveTenantsError &&
      error.code === "invalid_response",
  )
})

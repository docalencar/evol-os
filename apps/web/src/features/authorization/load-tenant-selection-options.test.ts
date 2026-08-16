import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

import type { SupabaseClient } from "@supabase/supabase-js"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only" ? { shortCircuit: true, url: "server-only:test" } : nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    return url === "server-only:test" ? { format: "module", shortCircuit: true, source: "export {}" } : nextLoad(url, context)
  },
})

const load = () => import("./load-tenant-selection-options")

function createSupabase(rows: unknown, error: unknown = null): SupabaseClient {
  return {
    rpc: async () => ({ data: rows, error }),
  } as unknown as SupabaseClient
}

test("no active membership yields no_membership", async () => {
  const { loadTenantSelectionOptions } = await load()
  const result = await loadTenantSelectionOptions(
    createSupabase([]),
  )
  assert.deepEqual(result, { status: "no_membership" })
})

test("exactly one active membership yields single (no options list)", async () => {
  const { loadTenantSelectionOptions } = await load()
  const result = await loadTenantSelectionOptions(
    createSupabase([
      { company_id: "company-a", company_name: "Alpha", membership_role: "owner" },
    ]),
  )
  assert.deepEqual(result, { status: "single", companyId: "company-a" })
})

test("multiple active memberships yield deterministic options with company names", async () => {
  const { loadTenantSelectionOptions } = await load()
  const result = await loadTenantSelectionOptions(
    createSupabase([
      { company_id: "company-b", company_name: "Beta", membership_role: "admin" },
      { company_id: "company-a", company_name: "Alpha", membership_role: "owner" },
    ]),
  )
  assert.deepEqual(result, {
    status: "options",
    options: [
      { companyId: "company-a", companyName: "Alpha" },
      { companyId: "company-b", companyName: "Beta" },
    ],
  })
})

test("fails closed when the RPC returns a malformed company name", async () => {
  const { loadTenantSelectionOptions } = await load()
  const result = await loadTenantSelectionOptions(
    createSupabase([
      { company_id: "company-a", company_name: "Alpha", membership_role: "owner" },
      { company_id: "company-b", company_name: null, membership_role: "admin" },
    ]),
  )
  assert.deepEqual(result, { status: "no_membership" })
})

test("fail-closed: a read error yields no_membership, never fabricated options", async () => {
  const { loadTenantSelectionOptions } = await load()
  const result = await loadTenantSelectionOptions(createSupabase(null, { message: "boom" }))
  assert.deepEqual(result, { status: "no_membership" })
})

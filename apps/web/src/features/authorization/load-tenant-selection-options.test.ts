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
  const query = {
    select: () => query,
    eq: () => query,
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: rows, error }).then(resolve),
  }
  return { from: () => query } as unknown as SupabaseClient
}

test("no active membership yields no_membership", async () => {
  const { loadTenantSelectionOptions } = await load()
  const result = await loadTenantSelectionOptions(
    createSupabase([{ company_id: "company-a", status: "inactive", companies: { name: "A" } }]),
    "user-1",
  )
  assert.deepEqual(result, { status: "no_membership" })
})

test("exactly one active membership yields single (no options list)", async () => {
  const { loadTenantSelectionOptions } = await load()
  const result = await loadTenantSelectionOptions(
    createSupabase([
      { company_id: "company-a", status: "active", companies: { name: "Alpha" } },
      { company_id: "company-b", status: "inactive", companies: { name: "Beta" } },
    ]),
    "user-1",
  )
  assert.deepEqual(result, { status: "single", companyId: "company-a" })
})

test("multiple active memberships yield deterministic options with company names", async () => {
  const { loadTenantSelectionOptions } = await load()
  const result = await loadTenantSelectionOptions(
    createSupabase([
      { company_id: "company-b", status: "active", companies: { name: "Beta" } },
      { company_id: "company-a", status: "active", companies: { name: "Alpha" } },
    ]),
    "user-1",
  )
  assert.deepEqual(result, {
    status: "options",
    options: [
      { companyId: "company-a", companyName: "Alpha" },
      { companyId: "company-b", companyName: "Beta" },
    ],
  })
})

test("handles the embedded company as an array and falls back to the id when the name is missing", async () => {
  const { loadTenantSelectionOptions } = await load()
  const result = await loadTenantSelectionOptions(
    createSupabase([
      { company_id: "company-a", status: "active", companies: [{ name: "Alpha" }] },
      { company_id: "company-b", status: "active", companies: null },
    ]),
    "user-1",
  )
  assert.deepEqual(result, {
    status: "options",
    options: [
      { companyId: "company-a", companyName: "Alpha" },
      { companyId: "company-b", companyName: "company-b" },
    ],
  })
})

test("fail-closed: a read error yields no_membership, never fabricated options", async () => {
  const { loadTenantSelectionOptions } = await load()
  const result = await loadTenantSelectionOptions(createSupabase(null, { message: "boom" }), "user-1")
  assert.deepEqual(result, { status: "no_membership" })
})

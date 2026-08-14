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

const loadRepository = () => import("./tenant-preference-repository")

function createSupabase(result: { data: unknown; error: unknown }): SupabaseClient {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: () => Promise.resolve(result),
  }
  return { from: () => query } as unknown as SupabaseClient
}

test("returns the preferred company id when a preference row exists", async () => {
  const { readActiveTenantPreference } = await loadRepository()
  const supabase = createSupabase({ data: { preferred_company_id: "company-a" }, error: null })
  assert.deepEqual(await readActiveTenantPreference(supabase, "user-1"), {
    preferredCompanyId: "company-a",
  })
})

test("returns null when there is no preference row", async () => {
  const { readActiveTenantPreference } = await loadRepository()
  const supabase = createSupabase({ data: null, error: null })
  assert.deepEqual(await readActiveTenantPreference(supabase, "user-1"), {
    preferredCompanyId: null,
  })
})

test("fail-closed: returns null on a database error", async () => {
  const { readActiveTenantPreference } = await loadRepository()
  const supabase = createSupabase({ data: null, error: { message: "boom" } })
  assert.deepEqual(await readActiveTenantPreference(supabase, "user-1"), {
    preferredCompanyId: null,
  })
})

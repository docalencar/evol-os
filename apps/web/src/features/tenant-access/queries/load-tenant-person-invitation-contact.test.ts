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

const loadModule = () => import("./load-tenant-person-invitation-contact")

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

test("loads only the tenant Person contact through 0082", async () => {
  const { loadTenantPersonInvitationContact } = await loadModule()
  const calls: Array<readonly [string, unknown]> = []
  const result = await loadTenantPersonInvitationContact(
    createSupabase(
      [{ person_id: "person-1", email: "person@example.com" }],
      null,
      (name, params) => calls.push([name, params]),
    ),
    "company-1",
    "person-1",
  )

  assert.deepEqual(calls, [[
    "get_tenant_person_invitation_contact_v1",
    { p_company_id: "company-1", p_person_id: "person-1" },
  ]])
  assert.deepEqual(result, { personId: "person-1", email: "person@example.com" })
})

test("fails closed for database errors and malformed or mismatched rows", async () => {
  const { loadTenantPersonInvitationContact } = await loadModule()

  for (const supabase of [
    createSupabase(null, { message: "sensitive PostgREST detail" }),
    createSupabase([]),
    createSupabase([{ person_id: "other-person", email: "person@example.com" }]),
    createSupabase([{ person_id: "person-1", email: 42 }]),
  ]) {
    assert.equal(
      await loadTenantPersonInvitationContact(supabase, "company-1", "person-1"),
      null,
    )
  }
})

test("preserves a nullable persisted email without inventing eligibility", async () => {
  const { loadTenantPersonInvitationContact } = await loadModule()
  assert.deepEqual(
    await loadTenantPersonInvitationContact(
      createSupabase([{ person_id: "person-1", email: null }]),
      "company-1",
      "person-1",
    ),
    { personId: "person-1", email: null },
  )
})

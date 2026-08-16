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

const loadModule = () => import("./onboarding-access-state")

function createSupabase(data: unknown, error: unknown = null): SupabaseClient {
  return {
    rpc: async () => ({ data, error }),
  } as unknown as SupabaseClient
}

test("zero active memberships allows first-company onboarding", async () => {
  const { getOnboardingAccessState } = await loadModule()
  assert.equal(await getOnboardingAccessState(createSupabase([])), "setup_required")
})

test("any active membership prevents a second-company onboarding", async () => {
  const { getOnboardingAccessState } = await loadModule()
  assert.equal(
    await getOnboardingAccessState(
      createSupabase([
        { company_id: "company-a", company_name: "Alpha", membership_role: "owner" },
        { company_id: "company-b", company_name: "Beta", membership_role: "admin" },
      ]),
    ),
    "membership_exists",
  )
})

test("read failure rejects instead of exposing the onboarding form", async () => {
  const { CurrentUserActiveTenantsError } = await import(
    "@/features/authorization/server"
  )
  const { getOnboardingAccessState } = await loadModule()

  await assert.rejects(
    getOnboardingAccessState(createSupabase(null, { message: "permission denied" })),
    (error: unknown) =>
      error instanceof CurrentUserActiveTenantsError && error.code === "read_failed",
  )
})

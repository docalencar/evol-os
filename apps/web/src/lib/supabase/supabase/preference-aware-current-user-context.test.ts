import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { registerHooks } from "node:module"
import { resolve } from "node:path"
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

type ActiveTenantRow = Readonly<{
  company_id: string
  company_name: string
  membership_role: string
}>

function createSupabase(
  activeTenants: readonly ActiveTenantRow[],
  preferredCompanyId: string | null,
  onPreferenceRead?: () => void,
): SupabaseClient {
  return {
    rpc: async () => ({ data: activeTenants, error: null }),
    from(table: string) {
      if (table === "tenant_membership_preferences") {
        const preferenceQuery = {
          select: () => preferenceQuery,
          eq: () => preferenceQuery,
          maybeSingle: async () => {
            onPreferenceRead?.()
            return {
              data: preferredCompanyId
                ? { preferred_company_id: preferredCompanyId }
                : null,
              error: null,
            }
          },
        }
        return preferenceQuery
      }

      throw new Error(`Unexpected table read: ${table}`)
    },
  } as unknown as SupabaseClient
}

const user = { id: "user-1" } as User
const memberships: readonly ActiveTenantRow[] = [
  { company_id: "company-a", company_name: "Alpha", membership_role: "owner" },
  { company_id: "company-b", company_name: "Beta", membership_role: "admin" },
]

async function withFlag<T>(value: string | undefined, run: () => Promise<T>) {
  const env = process.env as Record<string, string | undefined>
  const previous = env.TENANT_PREFERENCE_RESOLUTION_ENABLED
  try {
    if (value === undefined) delete env.TENANT_PREFERENCE_RESOLUTION_ENABLED
    else env.TENANT_PREFERENCE_RESOLUTION_ENABLED = value
    return await run()
  } finally {
    if (previous === undefined) delete env.TENANT_PREFERENCE_RESOLUTION_ENABLED
    else env.TENANT_PREFERENCE_RESOLUTION_ENABLED = previous
  }
}

test("valid preference resolves the matching active membership", async () => {
  await withFlag("true", async () => {
    const { loadPreferenceAwareCurrentUserContext } = await import(
      "./preference-aware-current-user-context"
    )
    const result = await loadPreferenceAwareCurrentUserContext(
      createSupabase(memberships, "company-b"),
      user,
    )
    assert.deepEqual(result, {
      userId: "user-1",
      companyId: "company-b",
      role: "admin",
    })
  })
})

test("foreign and inactive preferences remain fail-closed", async () => {
  await withFlag("true", async () => {
    const { CurrentUserContextError } = await import("@/features/authorization")
    const { loadPreferenceAwareCurrentUserContext } = await import(
      "./preference-aware-current-user-context"
    )

    for (const preferred of ["company-foreign", "company-c"]) {
      await assert.rejects(
        loadPreferenceAwareCurrentUserContext(
          createSupabase(memberships, preferred),
          user,
        ),
        (error: unknown) =>
          error instanceof CurrentUserContextError &&
          error.code === "tenant_selection_required",
      )
    }
  })
})

test("flag OFF preserves prior behavior and does not read the preference", async () => {
  await withFlag(undefined, async () => {
    const { CurrentUserContextError } = await import("@/features/authorization")
    const { loadPreferenceAwareCurrentUserContext } = await import(
      "./preference-aware-current-user-context"
    )
    let preferenceReads = 0

    await assert.rejects(
      loadPreferenceAwareCurrentUserContext(
        createSupabase(memberships, "company-b", () => preferenceReads++),
        user,
      ),
      (error: unknown) =>
        error instanceof CurrentUserContextError &&
        error.code === "tenant_selection_required",
    )
    assert.equal(preferenceReads, 0)
  })
})

test("helper is server-only and introduces no JWT, browser, or local authority", () => {
  const source = readFileSync(
    resolve(
      process.cwd(),
      "src/lib/supabase/supabase/preference-aware-current-user-context.ts",
    ),
    "utf8",
  )
  assert.match(source, /import "server-only"/)
  assert.doesNotMatch(source, /user_metadata|app_metadata|localStorage|window\.|service_role/)
})

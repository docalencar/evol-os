import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const source = readFileSync(
  resolve(process.cwd(), "src/lib/supabase/supabase/current-company.ts"),
  "utf8",
)

test("membership_not_found still redirects to onboarding (unchanged)", () => {
  assert.match(source, /error\.code === "membership_not_found"[\s\S]{0,60}redirect\("\/onboarding"\)/)
})

test("tenant_selection_required is handled ONLY when the flag is ON, routing to /select-company", () => {
  assert.match(
    source,
    /error\.code === "tenant_selection_required" &&\s*isTenantPreferenceResolutionEnabled\(\)[\s\S]{0,60}redirect\("\/select-company"\)/,
  )
})

test("other errors are not masked (rethrown) and no tenant is chosen implicitly", () => {
  assert.match(source, /throw error/)
  assert.doesNotMatch(source, /limit\(1\)|memberships\[0\]|first/i)
  assert.doesNotMatch(source, /service_role/)
})

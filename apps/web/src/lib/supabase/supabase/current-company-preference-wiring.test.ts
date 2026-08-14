import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const source = readFileSync(
  resolve(process.cwd(), "src/lib/supabase/supabase/current-company.ts"),
  "utf8",
)

test("preference read is flag-gated and defaults to no preference", () => {
  assert.match(source, /let preferredCompanyId: string \| null = null/)
  assert.match(source, /if \(isTenantPreferenceResolutionEnabled\(\)\) \{/)
  assert.match(source, /readActiveTenantPreference\(supabase, user\.id\)/)
})

test("the resolved preference is passed to loadCurrentUserContext as context", () => {
  assert.match(source, /loadCurrentUserContext\(supabase, user, preferredCompanyId\)/)
})

test("preference wiring introduces no browser authority, service_role or first-row fallback", () => {
  assert.doesNotMatch(source, /service_role/)
  assert.doesNotMatch(source, /limit\(1\)/)
  // company id used for resolution comes from the resolver, never from a request payload.
  assert.doesNotMatch(source, /searchParams|req\.body|formData/)
})

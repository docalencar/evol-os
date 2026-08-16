import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const page = readFileSync(resolve(process.cwd(), "src/app/select-company/page.tsx"), "utf8")

test("route is feature-flag gated and hidden (notFound) when OFF", () => {
  assert.match(page, /if \(!isTenantPreferenceResolutionEnabled\(\)\) \{\s*notFound\(\)/)
})

test("route is auth-only and sends unauthenticated users to /login", () => {
  assert.match(page, /supabase\.auth\.getUser\(\)/)
  assert.match(page, /redirect\("\/login"\)/)
})

test("route uses its own membership loader and never resolves the current company (loop prevention)", () => {
  assert.match(page, /loadTenantSelectionOptions\(supabase\)/)
  assert.doesNotMatch(page, /loadTenantSelectionOptions\([^)]*user\.id/)
  assert.doesNotMatch(page, /\.from\("company_members"\)/)
  assert.doesNotMatch(page, /getCurrentCompanyContext/)
})

test("route routes no_membership -> onboarding, single -> /app, and never picks a tenant implicitly", () => {
  assert.match(page, /result\.status === "no_membership"[\s\S]{0,40}redirect\("\/onboarding"\)/)
  assert.match(page, /result\.status === "single"[\s\S]{0,40}redirect\("\/app"\)/)
  assert.doesNotMatch(page, /options\[0\]|\.find\(|first/i)
})

test("route renders the functional safe selection state and introduces no privileged access", () => {
  assert.match(page, /Selecione uma empresa/)
  assert.match(page, /<TenantSelectionForm options=\{result\.options\} \/>/)
  assert.doesNotMatch(page, /seleção de empresa será habilitada em breve/i)
  assert.doesNotMatch(page, /service_role/)
  assert.doesNotMatch(page, /searchParams|companyId:\s*(request|params|body)/)
})

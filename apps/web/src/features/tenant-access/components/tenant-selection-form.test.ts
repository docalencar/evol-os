import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const form = readFileSync(
  resolve(process.cwd(), "src/features/tenant-access/components/tenant-selection-form.tsx"),
  "utf8",
)

test("renders explicit accessible tenant choices supplied by the server", () => {
  assert.match(form, /<fieldset disabled=\{isPending\}/)
  assert.match(form, /<legend className="sr-only">Empresas disponíveis<\/legend>/)
  assert.match(form, /type="radio"/)
  assert.match(form, /name="companyId"/)
  assert.match(form, /\{option\.companyName\}/)
  assert.match(form, /useState\(""\)/)
})

test("submits only companyId through the existing server action", () => {
  assert.match(form, /selectActiveTenantAction\(\{ companyId \}\)/)
  assert.doesNotMatch(form, /actorUserId|userId|membershipId|preferredCompanyId/)
})

test("successful selection rebuilds app navigation only after server confirmation", () => {
  assert.match(form, /result\.status === "selected"/)
  assert.match(form, /router\.replace\("\/app"\)/)
  assert.match(form, /router\.refresh\(\)/)
  const effect = form.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[errorMessage\]\)/)?.[0] ?? ""
  assert.doesNotMatch(effect, /selectActiveTenantAction/)
})

test("pending and a synchronous guard prevent local double submission", () => {
  assert.match(form, /submissionInFlight\.current/)
  assert.match(form, /if \(submissionInFlight\.current\) return/)
  assert.match(form, /disabled=\{isPending \|\| !selectedCompanyId\}/)
  assert.match(form, /fieldset disabled=\{isPending\}/)
})

test("errors remain textual, focusable and recoverable", () => {
  assert.match(form, /role="alert"/)
  assert.match(form, /errorRef\.current\?\.focus\(\)/)
  assert.match(form, /submissionInFlight\.current = false/)
  assert.match(form, /setErrorMessage\(result\.message\)/)
})

test("client boundary has no database or local authority access", () => {
  assert.match(form, /^"use client"/)
  assert.doesNotMatch(form, /server-only|createClient|Supabase|\.rpc\(|\.from\(|company_members|localStorage|service_role/)
})

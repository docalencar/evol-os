import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const source = readFileSync(
  resolve(process.cwd(), "src/features/tenant-access/components/tenant-switcher.tsx"),
  "utf8",
)

test("shows current company and only renders a switch control when authorized options allow it", () => {
  assert.match(source, /Empresa atual/)
  assert.match(source, /\{currentCompanyName\}/)
  assert.match(source, /canSwitch \? \(/)
  assert.match(source, /options\.map\(\(option\)/)
})

test("sends only companyId through the existing Action", () => {
  assert.match(source, /selectActiveTenantAction\(\{ companyId \}\)/)
  assert.doesNotMatch(source, /actorUserId|userId|membershipId|preferredCompanyId/)
})

test("success returns to a safe route and refreshes only after server confirmation", () => {
  assert.match(source, /result\.status === "selected"/)
  assert.match(source, /router\.replace\("\/app"\)/)
  assert.match(source, /router\.refresh\(\)/)
})

test("pending and synchronous guards prevent incompatible duplicate switches", () => {
  assert.match(source, /switchInFlight\.current/)
  assert.match(source, /disabled=\{isPending\}/)
  assert.match(source, /companyId === currentCompanyId/)
})

test("errors are safe, accessible, and recoverable; expired sessions go to login", () => {
  assert.match(source, /role="alert"/)
  assert.match(source, /errorRef\.current\?\.focus\(\)/)
  assert.match(source, /switchInFlight\.current = false/)
  assert.match(source, /result\.status === "session_expired"/)
  assert.match(source, /router\.replace\("\/login"\)/)
})

test("client switcher has no data-access or local-authority path", () => {
  assert.match(source, /^"use client"/)
  assert.doesNotMatch(
    source,
    /server-only|createClient|Supabase|\.rpc\(|\.from\(|company_members|localStorage|service_role|user_metadata|app_metadata/,
  )
})

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const page = readFileSync(
  new URL("../../../app/(dashboard)/app/people/page.tsx", import.meta.url),
  "utf8",
)

test("People list loads the historical (all-status) roster, not the terminated-excluding v1", () => {
  // Roster must include terminated ("Desligado") people so the workspace summary
  // counts and the status filter reflect the real headcount (P0-A).
  assert.match(page, /getManagementPeopleIncludingTerminated\(companyId\)/)
  assert.doesNotMatch(page, /getManagementPeople\(companyId\)/)
})

test("People list resolves tenant on the server and never reads protected tables directly", () => {
  assert.doesNotMatch(page, /["']use client["']/)
  assert.match(page, /getCurrentCompanyContext\(\)/)
  assert.doesNotMatch(page, /createClient|company_members|\.from\(/)
})

test("Manager selectors stay scoped to non-terminated people", () => {
  // Terminated people are shown in the roster but must not be assignable managers,
  // preserving the prior v1 manager-selector and manager-name resolution behavior.
  assert.match(page, /status !== "terminated"/)
})

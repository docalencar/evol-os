import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const currentCompany = readFileSync(
  new URL("../../../lib/supabase/supabase/current-company.ts", import.meta.url),
  "utf8",
)
const issue = readFileSync(
  new URL("./issue-company-member-invitation-action.ts", import.meta.url),
  "utf8",
)
const resend = readFileSync(
  new URL("./resend-company-member-invitation-action.ts", import.meta.url),
  "utf8",
)

test("current company uses canonical projections without direct table reads", () => {
  assert.match(currentCompany, /companyName: currentUser\.companyName/)
  assert.match(currentCompany, /rpc\("current_person_id"/)
  assert.doesNotMatch(currentCompany, /\.from\(["'](?:companies|people)["']\)/)
  assert.doesNotMatch(currentCompany, /\bperson,|select\(["']\*["']\)/)
})

test("issue obtains company name from context and Person email only through 0082", () => {
  assert.match(issue, /companyName: currentUser\.companyName/)
  assert.match(issue, /loadTenantPersonInvitationContact/)
  assert.doesNotMatch(issue, /\.from\(["'](?:companies|people)["']\)/)
  assert.doesNotMatch(issue, /targetEmail|email:\s*input|input\.email/)
})

test("resend uses canonical company context and performs no redundant reads", () => {
  assert.match(resend, /companyName: currentUser\.companyName/)
  assert.doesNotMatch(resend, /\.from\(["'](?:companies|people)["']\)/)
  assert.doesNotMatch(resend, /destinationEmail/)
})

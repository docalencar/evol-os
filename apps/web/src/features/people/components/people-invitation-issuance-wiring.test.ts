import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const page = readFileSync(
  new URL("../../../app/(dashboard)/app/people/page.tsx", import.meta.url),
  "utf8",
)
const table = readFileSync(new URL("./employee-table.tsx", import.meta.url), "utf8")

test("People derives invitation role options from the server-resolved actor role", () => {
  assert.match(page, /currentUser.*getCurrentCompanyContext\(\)/)
  assert.match(page, /getInvitationRoleOptionsForActor\(currentUser\.role\)/)
  assert.match(page, /invitationRoleOptions=\{invitationRoleOptions\}/)
})

test("table offers the action only for an obvious eligible existing Person", () => {
  assert.match(table, /invitationRoleOptions\.length > 0/)
  assert.match(table, /employee\.status === "active"/)
  assert.match(table, /employee\.user_id === null/)
  assert.match(table, /employee\.email \? \(/)
  assert.match(table, /<InvitationIssueDialog/)
})

test("People UI sends no tenant or actor authority into the invitation dialog", () => {
  const dialogProps = table.match(/<InvitationIssueDialog[\s\S]*?\/>/)?.[0] ?? ""
  assert.match(dialogProps, /personId=\{employee\.id\}/)
  assert.match(dialogProps, /email=\{employee\.email\}/)
  assert.doesNotMatch(dialogProps, /companyId|actorUserId|currentUser/)
})

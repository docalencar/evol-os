import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const page = readFileSync(new URL("../../../app/(dashboard)/app/people/page.tsx", import.meta.url), "utf8")
const table = readFileSync(new URL("./employee-table.tsx", import.meta.url), "utf8")

test("People loads the safe projection in parallel and composes by personId", () => {
  assert.match(page, /Promise\.all\(/)
  assert.match(page, /getPeopleAccessStates\(supabase, companyId\)/)
  assert.match(page, /accessStateByPersonId\.get\(employee\.id\)/)
  assert.match(page, /presentPeopleAccessState\(/)
})

test("EmployeeTable renders compact textual access state and receives no new tenant authority", () => {
  assert.match(table, /header: "Acesso"/)
  assert.match(table, /employee\.accessState\.label/)
  assert.match(table, /employee\.accessState\.roleLabel/)
  const actions = table.match(/<PeopleAccessActions[\s\S]*?\/>/)?.[0] ?? ""
  assert.match(actions, /invitationId=/)
  assert.match(actions, /expectedGeneration=/)
  assert.doesNotMatch(actions, /companyId|actorUserId/)
})

test("issue, resend and revoke visibility use the server-presented state", () => {
  assert.match(table, /employee\.accessState\.canIssue/)
  assert.match(table, /employee\.accessState\.canResend/)
  assert.match(table, /employee\.accessState\.canRevoke/)
})

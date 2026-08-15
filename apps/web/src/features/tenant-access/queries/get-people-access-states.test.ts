import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const repository = readFileSync(new URL("../repositories/people-access-state-repository.ts", import.meta.url), "utf8")
const query = readFileSync(new URL("./get-people-access-states.ts", import.meta.url), "utf8")

test("query uses only the safe RPC with server-supplied companyId", () => {
  assert.match(repository, /\.rpc\("get_people_access_state_v2",\s*\{\s*p_company_id: companyId/)
  assert.doesNotMatch(repository, /get_people_access_state_v1/)
  assert.doesNotMatch(repository, /\.from\(|company_member_invitations|service_role/)
  assert.match(query, /import "server-only"/)
})

test("repository validates and maps the approved projection", () => {
  assert.match(repository, /z\.array\(rowSchema\)\.safeParse\(payload\)/)
  assert.match(repository, /personId: row\.person_id/)
  assert.match(repository, /membershipId: row\.membership_id/)
  assert.match(repository, /membership_id: z\.string\(\)\.uuid\(\)\.nullable\(\)/)
  assert.match(repository, /invitationExpiresAt: row\.invitation_expires_at/)
})

test("invalid payload and failures degrade to unavailable", () => {
  assert.match(repository, /if \(!parsed\.success\) return null/)
  assert.match(query, /status: "unavailable"/)
  assert.match(query, /catch/)
})

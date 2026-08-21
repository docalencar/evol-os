import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const page = readFileSync(
  new URL("./page.tsx", import.meta.url),
  "utf8"
)

test("2/3. a valid person origin resolves the back link to that profile", () => {
  // Only accepted context is a person id; back destination is the internal
  // /app/people/<id> route with the contextual label.
  assert.match(page, /fromPersonId/)
  assert.match(page, /\/app\/people\/\$\{personId\.data\}/)
  assert.match(page, /Voltar para o perfil/)
})

test("4. the normal flow still returns to the Company hub", () => {
  assert.match(page, /href: "\/app\/company"/)
  assert.match(page, /Voltar para empresa/)
})

test("5/6. origin context is UUID-validated — no open/arbitrary redirect", () => {
  assert.match(page, /z\s*\.string\(\)\s*\.uuid\(\)\s*\.safeParse/)
  // The back href is built ONLY from the validated value, never the raw param.
  assert.doesNotMatch(page, /href:\s*`?\$?\{?fromPersonId/)
  // No generic returnTo/redirect path contract is accepted.
  assert.doesNotMatch(page, /returnTo|redirectTo|\bfrom=\b/)
})

test("7. existing Team management (create + list) is untouched", () => {
  assert.match(page, /TeamCreateDialog/)
  assert.match(page, /TeamTable/)
  assert.match(page, /getManagementTeams/)
})

test("8/9. no persistence/RPC/schema change is introduced", () => {
  assert.doesNotMatch(page, /-action|create_tenant_|\.rpc\(|\.insert\(|\.from\(/)
})

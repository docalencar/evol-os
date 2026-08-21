import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const page = readFileSync(
  new URL("./page.tsx", import.meta.url),
  "utf8"
)

const section = readFileSync(
  new URL(
    "../../../../../features/organization/position-seniorities/components/position-seniorities-section.tsx",
    import.meta.url
  ),
  "utf8"
)

test("1/2. the Position section bridges to Seniority management with typed origin", () => {
  assert.match(section, /Gerenciar senioridades/)
  assert.match(section, /\/app\/company\/seniority\?fromPositionId=/)
  assert.match(section, /encodeURIComponent\(positionId\)/)
})

test("3/4/5. valid origin resolves the back link to the position", () => {
  assert.match(page, /fromPositionId/)
  assert.match(page, /z\s*\.string\(\)\s*\.uuid\(\)\s*\.safeParse/)
  assert.match(page, /\/app\/company\/positions\/\$\{positionId\.data\}/)
  assert.match(page, /Voltar para o cargo/)
})

test("6. the normal flow still returns to the Company hub", () => {
  assert.match(page, /href: "\/app\/company"/)
  assert.match(page, /Voltar para empresa/)
})

test("7/8. origin is UUID-validated — no open/arbitrary redirect", () => {
  // The back href is built only from the validated value, never the raw param.
  assert.doesNotMatch(page, /href:\s*`?\$?\{?fromPositionId/)
  assert.doesNotMatch(page, /returnTo|redirectTo|\bfrom=\b/)
})

test("9. the optional 'no specific seniority' copy remains", () => {
  assert.match(section, /Este cargo não utiliza senioridade específica\./)
})

test("10. no inline seniority creation was added to the Position section", () => {
  assert.doesNotMatch(section, /SeniorityLevelCreateDialog/)
})

test("11. no DB/RPC/persistence access is introduced by the bridge", () => {
  assert.doesNotMatch(page, /\.from\(|\.rpc\(|create_tenant_/)
  assert.doesNotMatch(section, /\.from\(|\.rpc\(|create_tenant_/)
})

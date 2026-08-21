import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const page = readFileSync(
  new URL("./page.tsx", import.meta.url),
  "utf8"
)

test("1. the Company home exposes the Teams destination", () => {
  assert.match(page, /href="\/app\/company\/teams"/)
})

test("2/3. the Teams destination shows 'Times' with the 'Gerenciar times' CTA", () => {
  assert.match(page, /Times/)
  assert.match(page, /Gerenciar times/)
})

test("4. existing Cargos navigation remains", () => {
  assert.match(page, /href="\/app\/company\/positions"/)
  assert.match(page, /Gerenciar cargos/)
})

test("5. existing Senioridades navigation remains", () => {
  assert.match(page, /href="\/app\/company\/seniority"/)
  assert.match(page, /Gerenciar senioridades/)
})

test("6. no readiness/completion/pressure language is introduced", () => {
  assert.doesNotMatch(page, /%/)
  assert.doesNotMatch(
    page,
    /configuração incompleta|incompleto|obrigat[óo]ri|readiness|prontidão|pendente|você precisa/i
  )
  // Teams is presented as optional ("quando isso fizer sentido").
  assert.match(page, /quando isso\s+fizer sentido/i)
})

test("7. no Team domain/RPC/repository implementation is duplicated here", () => {
  assert.doesNotMatch(page, /create_tenant_team_v1|createTeamRepository|TeamCreateDialog|TeamForm/)
})

test("8. no direct DB/table access is added by the navigation card", () => {
  assert.doesNotMatch(page, /\.from\(/)
  // The card is a plain link; it introduces no new data read.
  assert.doesNotMatch(page, /getManagementTeams/)
})

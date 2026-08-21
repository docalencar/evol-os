import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const sidebar = readFileSync(
  new URL("./employee-profile-sidebar.tsx", import.meta.url),
  "utf8"
)

const viewModel = readFileSync(
  new URL(
    "../view-models/employee-workspace-view-model.ts",
    import.meta.url
  ),
  "utf8"
)

test("1/2. the profile sidebar bridges to Team management with the canonical label", () => {
  // Carries the person id as narrow, typed origin context.
  assert.match(sidebar, /\/app\/company\/teams\?fromPersonId=/)
  assert.match(sidebar, /encodeURIComponent\(personId\)/)
  assert.match(sidebar, /href=\{manageTeamsHref\}/)
  assert.match(sidebar, /Gerenciar times/)
  // Uses the DashboardCard actions slot (no new design primitive).
  assert.match(sidebar, /actions=\{/)
  // personId is an explicit prop, not derived from strings.
  assert.match(sidebar, /personId: string/)
})

test("3. the Time row still renders via organization.teamLabel", () => {
  assert.match(sidebar, /"Time"/)
  assert.match(sidebar, /organization\.teamLabel/)
})

test("4. the 'Sem time definido' empty state is preserved by the contract", () => {
  // The label/default lives in the presenter/view-model, unchanged by this slice.
  assert.match(viewModel, /teamLabel: string/)
})

test("5/6/7. Departamento, Cargo and Senioridade rows remain intact", () => {
  assert.match(sidebar, /"Departamento"/)
  assert.match(sidebar, /organization\.departmentLabel/)
  assert.match(sidebar, /"Cargo"/)
  assert.match(sidebar, /organization\.positionLabel/)
  assert.match(sidebar, /"Senioridade"/)
  assert.match(sidebar, /organization\.seniorityLabel/)
})

test("8. no inline Team creation is introduced", () => {
  assert.doesNotMatch(sidebar, /TeamCreateDialog|TeamForm|create-team/)
})

test("9. no Team/Person RPC/action/schema/persistence code is introduced", () => {
  assert.doesNotMatch(sidebar, /-action|create_tenant_|\.rpc\(|createTeamSchema|getManagementTeams/)
})

test("10. no readiness/completeness/pressure language is introduced", () => {
  assert.doesNotMatch(sidebar, /%/)
  assert.doesNotMatch(
    sidebar,
    /configuração incompleta|incompleto|você precisa|obrigat[óo]ri|readiness|prontidão|falta definir/i
  )
})

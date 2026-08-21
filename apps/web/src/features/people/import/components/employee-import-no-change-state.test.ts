import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const panel = readFileSync(
  new URL("./employee-import-action-panel.tsx", import.meta.url),
  "utf8"
)

// The no-change branch is everything between the ternary opener and the ": (".
const noChangeBranch = panel.slice(
  panel.indexOf("planResult.dryRun.noChange ? ("),
  panel.indexOf(") : (")
)

test("the no-change state is driven by the existing dry-run result", () => {
  assert.match(panel, /planResult\.dryRun\.noChange \? \(/)
})

test("no-change shows 'Nenhuma alteração necessária' and safe copy", () => {
  assert.match(noChangeBranch, /Nenhuma alteração necessária/)
  assert.match(noChangeBranch, /já\s+estão sincronizados com a organização atual/)
})

test("no-change does NOT show apply / first-integration / apply-only copy", () => {
  assert.doesNotMatch(noChangeBranch, /Aplicar sincronização/)
  assert.doesNotMatch(noChangeBranch, /Aplique somente depois/)
  assert.doesNotMatch(noChangeBranch, /Nesta primeira integração/)
  // No error/duplicate/conflict framing.
  assert.doesNotMatch(noChangeBranch, /duplicad|conflito|erro|inválid/i)
})

test("no-change offers useful next actions instead of an apply CTA", () => {
  assert.match(noChangeBranch, /Importar outra planilha/)
  assert.match(noChangeBranch, /Ver pessoas/)
  assert.match(noChangeBranch, /href="\/app\/people"/)
})

test("the normal apply flow is preserved for plans with changes", () => {
  // The else branch still contains the human confirmation + apply CTA.
  assert.match(panel, /Aplique somente depois/)
  assert.match(panel, /Aplicar sincronização/)
  assert.match(panel, /planResult\.workspace\.canApply/)
  assert.match(panel, /decision\s*\.status === "blocked"/)
})

test("no DB/RPC/persistence access is introduced by the no-change state", () => {
  assert.doesNotMatch(panel, /\.from\(|\.rpc\(|create_tenant_|persistOrganizationTimeline/)
})

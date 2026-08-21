import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const component = readFileSync(
  new URL("./organization-sync-workspace-summary.tsx", import.meta.url),
  "utf8"
)

// The no-change header branch: everything under `if (workspace.noChange)`.
const noChangeBranch = component.slice(
  component.indexOf("if (workspace.noChange)"),
  component.indexOf("return (\n    <DashboardSection\n      title=\"Plano de sincronização\"\n      description={`Gerado em ${workspace.generatedAtLabel}. Revise")
)

test("E1. no-change header states nothing to apply and that it's already synchronized", () => {
  assert.match(noChangeBranch, /Nenhuma alteração necessária/)
  assert.match(noChangeBranch, /já estão sincronizados com a organização atual/)
})

test("E2. no-change header does NOT invite an apply action", () => {
  assert.doesNotMatch(noChangeBranch, /Revise o impacto antes de aplicar/)
  assert.doesNotMatch(noChangeBranch, /O que será aplicado/)
  // "Algumas estruturas já existentes..." must not be the main no-change summary.
  assert.doesNotMatch(noChangeBranch, /Algumas estruturas já existentes/)
})

test("F. the normal plan header retains review-before-apply guidance", () => {
  assert.match(component, /Revise o impacto antes de aplicar/)
  assert.match(component, /O que será aplicado/)
  assert.match(component, /workspace\.noChange/)
})

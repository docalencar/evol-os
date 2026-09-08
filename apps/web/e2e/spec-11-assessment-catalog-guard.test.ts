/**
 * Contract guard for spec 11 — RUNNER ONLY.
 *
 * E4-S2 covers seven properties of the assessment journey and deliberately stops
 * before the eighth. The line matters more than usual here: `Gerar avaliações`
 * writes the immutable 0114 execution snapshot, and once a run has crossed it
 * the tenant can no longer be deleted, only retired. A spec that drifted one
 * click past its slice would change what teardown has to do without anyone
 * deciding that.
 *
 * These assertions also pin the two habits this repository has paid for twice:
 * driving the journey through the product rather than a privileged client, and
 * never using a sleep where a state assertion belongs.
 *
 * ## Comments are stripped first
 *
 * The spec's own prose necessarily names `Gerar avaliações`, the later slices
 * and the traps it avoids, in order to explain why it stops where it does.
 * Asserting over raw file text would fail on that documentation — a trap that
 * has caught this repository before. Every negative assertion below therefore
 * runs against executable source only.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const raw = readFileSync(
  new URL("./specs/11-assessment-catalog-cycle.spec.ts", import.meta.url),
  "utf8"
)

/** Executable source: block comments, line comments and doc prose removed. */
const source = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"))
  .join("\n")

test("spec 11 stops before generation and never crosses into the next slice", () => {
  // The eighth property and everything after it. Each of these strings is a real
  // control or surface in the assessment UI, so a spec that reached one would
  // match here.
  for (const beyondScope of [
    "Gerar avaliações",
    "Enviar avaliação",
    "Responder",
    "Meus resultados",
    "Salvar rascunho",
  ]) {
    assert.equal(
      source.includes(beyondScope),
      false,
      `"${beyondScope}" belongs to a later slice; E4-S2 ends with the cycle active`
    )
  }
})

test("spec 11 drives the product and never a privileged client", () => {
  assert.doesNotMatch(source, /adminClient/)
  assert.doesNotMatch(source, /organization-lookup/)
  assert.doesNotMatch(source, /\.from\(|\.rpc\(|\.insert\(|\.update\(|service_role/)

  // Real navigation, not a bare goto into the middle of the journey.
  assert.doesNotMatch(source, /page\.goto\(/)
  assert.match(source, /getByRole\("link", \{ name: "Avaliações" \}\)/)
})

test("spec 11 never sleeps for synchronisation", () => {
  assert.doesNotMatch(source, /waitForTimeout|setTimeout|sleep\(/)
})

test("every mutation in spec 11 asserts the product's own success message", () => {
  // The shared structural guard already enforces the ordering for each submit
  // control. This pins the messages themselves, so a future edit cannot swap an
  // exact toast for a vague substring and still satisfy the ordering rule.
  for (const message of [
    "Modelo de avaliação criado com sucesso.",
    "Seção criada com sucesso.",
    "Pergunta criada com sucesso.",
    "Ciclo de avaliação criado com sucesso.",
    "Ciclo de avaliação atualizado com sucesso.",
    "Participantes adicionados com sucesso.",
  ]) {
    assert.ok(source.includes(message), `the exact toast "${message}" must be asserted`)
  }

  // Six mutations, six dialog-close assertions. A success toast on its own does
  // not distinguish "accepted" from "the form re-rendered with an error".
  const hidden = source.match(/toBeHidden/g) ?? []
  assert.ok(
    hidden.length >= 6,
    `expected a dialog-close assertion per mutation, found ${hidden.length}`
  )
})

test("the model is created active, because a draft one cannot carry a cycle", () => {
  // The cycle wizard filters to `template.active && template.status === "active"`
  // and disables its complete button when nothing qualifies. If a future edit
  // dropped this, property 5 would fail with a disabled button and no
  // explanation.
  // `[\s\S]` rather than the `s` flag: this workspace targets a lib below
  // es2018 and `tsc` rejects `dotAll`.
  assert.match(source, /#status[\s\S]*selectOption\(\{ label: TEMPLATE_ACTIVE_LABEL \}\)/)
  assert.match(source, /TEMPLATE_ACTIVE_LABEL = "Ativo"/)
})

test("the draft-to-active transition is proved by a durable readback", () => {
  // The activation lives in the cycles-table edit dialog, and the proof that it
  // took effect must survive a reload — not merely the toast.
  assert.match(source, /CYCLE_ACTIVE_LABEL = "Em andamento"/)

  const activation = source.slice(source.indexOf('name: "Salvar alterações"'))
  assert.ok(activation.length > 0, "the activation submit must exist")
  const reloadAt = activation.indexOf("page.reload()")
  const readbackAt = activation.indexOf("toContainText(CYCLE_ACTIVE_LABEL)")
  assert.ok(reloadAt > 0, "activation must be followed by a reload")
  assert.ok(readbackAt > reloadAt, "the active status must be read back AFTER the reload")
})

test("spec 11 stays in tenant A and leaves isolation to a later slice", () => {
  // Tenant B belongs to E4-S4. Touching it here would silently widen the run's
  // owned graph and the teardown that follows it.
  assert.doesNotMatch(source, /onboardingCompany|resolveAndJournalOnboardingTenant/)
  assert.doesNotMatch(source, /role === "onboarding"|role === "manager"|role === "employee"/)
  assert.match(source, /role === "admin"/)
})

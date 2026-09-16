/** Property 19: static, mutation-tested proof of privileged nonparticipant probes. */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const root = resolve(import.meta.dirname)
const spec = readFileSync(resolve(root, "specs/14-assessment-feedback-lifecycle.spec.ts"), "utf8")
const setup = readFileSync(resolve(root, "global-setup.ts"), "utf8")
const identity = readFileSync(resolve(root, "fixtures/synthetic-identity.ts"), "utf8")
const cleanup = readFileSync(resolve(root, "cleanup.ts"), "utf8")

function assertNonparticipantCoverage(source: string): void {
  assert.match(source, /for \(const role of \["employee", "admin", "company_admin", "hr"\] as const\)/)
  assert.match(source, /expect\(nonparticipant\.personId\)\.not\.toBe\(actor\("manager"\)\.personId\)/)
  assert.match(source, /expect\(nonparticipant\.personId\)\.not\.toBe\(actor\("evaluatee"\)\.personId\)/)
  assert.match(source, /await switchTo\(page, role\)\s+await page\.goto\(`\/app\/feedbacks\/\$\{threadId\}`\)\s+const deniedBody/)
  assert.match(source, /await page\.goto\(`\/app\/feedbacks\/\$\{NONEXISTENT_ID\}`\)/)
  assert.match(source, /toBe\(deniedBody\)/)
  assert.match(source, /deniedBody\)\.not\.toContain\(INITIAL_MESSAGE\)/)
  assert.match(source, /deniedBody\)\.not\.toContain\("Feedback da avaliação"\)/)
  assert.match(source, /getByRole\("heading", \{ name: "Conversa de feedback" \}\)\)\.toHaveCount\(0\)/)
  assert.match(source, /Confirmar recebimento\|Enviar resposta\|Encerrar conversa\|Arquivar conversa/)
  assert.match(source, /await switchTo\(page, "onboarding"\)/)
  assert.match(source, /name: "Atividade recente"/)
}

test("run-owned owner, company admin and HR are distinct tenant-A nonparticipants", () => {
  assert.match(setup, /"employee", "evaluatee", "company_admin", "hr"/)
  assert.match(identity, /admin: "owner"/)
  assert.match(identity, /company_admin: "admin"/)
  assert.match(identity, /hr: "hr"/)
  assert.match(cleanup, /"onboarding", "company_admin", "hr"/)
  assert.match(spec, /actor\("admin"\)\.membershipRole\)\.toBe\("owner"\)/)
  assert.match(spec, /actor\("company_admin"\)\.membershipRole\)\.toBe\("admin"\)/)
  assert.match(spec, /actor\("hr"\)\.membershipRole\)\.toBe\("hr"\)/)
})

test("every same-tenant nonparticipant gets a direct thread URL denial, not timeline-only proof", () => {
  assertNonparticipantCoverage(spec)
})

test("guard mutation probes fail red for missing role, timeline-only and participant substitution", () => {
  const mutations = [
    spec.replace('"employee", "admin", "company_admin", "hr"', '"employee", "admin", "company_admin"'),
    spec.replace('"employee", "admin", "company_admin", "hr"', '"employee", "admin", "hr"'),
    spec.replace('"employee", "admin", "company_admin", "hr"', '"employee", "company_admin", "hr"'),
    spec.replace('"employee", "admin", "company_admin", "hr"', '"admin", "company_admin", "hr"'),
    spec.replace('await page.goto(`/app/feedbacks/${threadId}`)\n      const deniedBody', 'await page.getByRole("link", { name: "Empresa" }).click()\n      const deniedBody'),
    spec.replace('expect(nonparticipant.personId).not.toBe(actor("evaluatee").personId)', 'expect(nonparticipant.personId).not.toBe(actor("hr").personId)'),
  ]
  for (const mutated of mutations) {
    assert.notEqual(mutated, spec, "mutation must apply")
    assert.throws(() => assertNonparticipantCoverage(mutated))
  }
})

/** Static guards for the E2E-5 hosted harness. No Review access. */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const root = resolve(import.meta.dirname)
const spec = readFileSync(resolve(root, "specs/14-assessment-feedback-lifecycle.spec.ts"), "utf8")
const fixture = readFileSync(resolve(root, "fixtures/tenant-fixture.ts"), "utf8")
const setup = readFileSync(resolve(root, "global-setup.ts"), "utf8")
const selfSpec = readFileSync(resolve(root, "specs/12-assessment-execution-result.spec.ts"), "utf8")
const journal = readFileSync(resolve(root, "helpers/journal.ts"), "utf8")
const retirement = readFileSync(resolve(root, "lifecycle/retire.ts"), "utf8")

test("dedicated evaluatee is linked to manager without changing E2E-4 self fixture", () => {
  assert.match(setup, /"admin", "manager", "employee", "evaluatee"/)
  assert.match(fixture, /update\(\{ manager_id: manager\.personId \}\)/)
  assert.match(fixture, /user\.role === "evaluatee"/)
  assert.match(selfSpec, /allow_self_assessment/)
  assert.match(selfSpec, /actor\("employee"\)/)
  assert.doesNotMatch(selfSpec, /actor\("evaluatee"\)/)
})

test("Autoavaliação uses its accessible checkbox name and is explicitly disabled", () => {
  assert.doesNotMatch(
    spec,
    /getByText\("Autoavaliação"[\s\S]{0,80}locator\("\.\."\)[\s\S]{0,80}getByRole\("checkbox"\)/,
  )
  assert.match(spec, /getByRole\("checkbox", \{ name: "Autoavaliação" \}\)/)
  assert.match(spec, /expect\(selfAssessmentCheckbox\)\.toBeVisible\(\)/)
  assert.match(spec, /selfAssessmentCheckbox\.isChecked\(\)/)
  assert.match(spec, /selfAssessmentCheckbox\.uncheck\(\)/)
  assert.match(spec, /perspective: "manager"/)
  assert.doesNotMatch(selfSpec, /selfAssessmentCheckbox/)
})

test("manager response and every journey id are discovered, never hardcoded", () => {
  assert.match(spec, /perspective: "manager"/)
  assert.match(spec, /evaluator_id: actor\("manager"\)\.personId/)
  assert.match(spec, /employee_id: actor\("evaluatee"\)\.personId/)
  assert.match(spec, /new URL\(page\.url\(\)\)/)
  assert.match(spec, /getAttribute\("href"\)/)
  assert.doesNotMatch(spec, /responseId = "[0-9a-f-]{36}"/)
  assert.doesNotMatch(spec, /threadId = "[0-9a-f-]{36}"/)
})

test("happy path uses UI while only duplicate capability uses the trusted RPC", () => {
  assert.match(spec, /getByRole\("button", \{ name: "Iniciar feedback" \}\)\.click\(\)/)
  assert.match(spec, /locator\("#assessment-feedback-initial-message"\)\.fill/)
  assert.equal((spec.match(/\.rpc\("create_assessment_feedback_v1"/g) ?? []).length, 1)
  assert.match(spec, /status: "already_exists"/)
  assert.match(spec, /expect\(count\.count\)\.toBe\(1\)/)
})

test("negative probes compare unauthorized and nonexistent outcomes", () => {
  assert.match(spec, /sameTenantBody/)
  assert.match(spec, /foreignBody/)
  assert.match(spec, /NONEXISTENT_ID/)
  assert.match(spec, /toBe\(sameTenantBody\)/)
  assert.match(spec, /toBe\(foreignBody\)/)
  assert.match(spec, /not\.toContain\(INITIAL_MESSAGE\)/)
})

test("durable readback follows product success and never uses timers", () => {
  assert.match(spec, /Conversa de feedback criada com sucesso/)
  assert.match(spec, /await page\.reload\(\)/)
  assert.match(spec, /Recebimento do feedback confirmado com sucesso/)
  assert.match(spec, /Conversa de feedback encerrada com sucesso/)
  assert.match(spec, /Conversa de feedback arquivada com sucesso/)
  assert.doesNotMatch(spec, /waitForTimeout|setTimeout|sleep\(/)
})

test("restricted audit is checked through the canonical company timeline", () => {
  assert.match(spec, /getByRole\("link", \{ name: "Empresa" \}\)/)
  assert.match(spec, /getByRole\("heading", \{ name: "Atividade recente" \}\)/)
  assert.match(spec, /"Feedback criado"/)
  assert.match(spec, /"Feedback arquivado"/)
  assert.match(spec, /not\.toContainText\(restrictedTitle\)/)
})

test("journal and teardown stay exact-id, fail-closed, and preserve immutable audit", () => {
  assert.match(journal, /mode: 0o600/)
  assert.match(journal, /OwnedResource/)
  assert.doesNotMatch(journal, /wildcard|ilike\(|\.like\(/)
  assert.match(retirement, /immutable[\s\S]*activity_events|activity_events[\s\S]*evidence/i)
  assert.match(retirement, /RETIRED/)
  assert.match(retirement, /retentionSnapshot/)
  assert.doesNotMatch(retirement, /delete\(\)[\s\S]*activity_events/)
})

test("terminal UI and optional attachment/mention absence are explicit", () => {
  assert.match(spec, /não aceita novas respostas/)
  assert.match(spec, /feedback_attachments/)
  assert.match(spec, /feedback_mentions/)
  assert.match(spec, /toHaveCount\(0\)/)
})

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

/**
 * Perspective checkboxes: the DEFECT CLASS, not two literals.
 *
 * The original harness located both perspective controls by matching the title
 * text and walking up one ancestor. That never worked: ParticipantCard puts the
 * input beside the span that groups title and description, so `..` lands on a
 * group with no checkbox in it. The first hosted failure was blamed on
 * "Autoavaliação" and fixed there — and the guard written alongside that fix
 * named "Autoavaliação" literally, so it could not see the identical chain two
 * lines below. The second hosted run failed on "Avaliação pelo gestor" for
 * exactly the same reason, at a cost of one full authorized run.
 *
 * These helpers therefore describe the SHAPE of the defect. They are exported
 * as functions over a source string so the tests below can run them against
 * deliberately broken sources and prove they still bite.
 */

/** Comments strip out: a guard must hold in code, not in prose about code. */
const executable = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

/** Whitespace and line breaks must not be able to hide the pattern. */
const flat = (source: string) => executable(source).replace(/\s+/g, " ")

/**
 * Every way a checkbox can be reached by climbing the DOM instead of naming it.
 *
 * 1. the direct chain, in any quoting or line layout;
 * 2. the same chain parked in a variable first, which a regex written against
 *    the one-liner would miss entirely.
 */
function ancestorTraversalCheckboxViolations(source: string): string[] {
  const violations: string[] = []
  const flattened = flat(source)

  const directChain = /\.locator\((['"])\.{2}(?:\/\.{2})*\1\)[^;]{0,200}?\.getByRole\((['"])checkbox\2/g
  for (const match of flattened.matchAll(directChain)) {
    violations.push(`ancestor traversal to a checkbox: ${match[0].slice(0, 90)}`)
  }

  // `const card = page.getByText(...).locator("..")` … later `card.getByRole("checkbox")`
  const traversalBinding = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*[^;]*?\.locator\((['"])\.{2}(?:\/\.{2})*\2\)/g
  for (const match of flattened.matchAll(traversalBinding)) {
    const binding = match[1]
    if (new RegExp(`\\b${binding}\\b[^;]{0,200}?\\.getByRole\\((['"])checkbox\\1`).test(flattened)) {
      violations.push(`checkbox reached through traversal binding \`${binding}\``)
    }
  }

  return violations
}

/**
 * The positive invariant, and the one that closes the class for good: a
 * checkbox is only ever addressed by its accessible name. The broken pattern
 * REQUIRES a bare `getByRole("checkbox")` with no name, because the name is
 * exactly what it was avoiding.
 */
function unnamedCheckboxLocators(source: string): string[] {
  return [...flat(source).matchAll(/\.getByRole\((['"])checkbox\1\s*([^)]*)\)/g)]
    .filter((match) => !/^,\s*\{\s*name:/.test(match[2]))
    .map((match) => `getByRole("checkbox"${match[2]}) has no accessible name`)
}

test("no perspective checkbox is reached by climbing the DOM", () => {
  assert.deepEqual(ancestorTraversalCheckboxViolations(spec), [])
  assert.deepEqual(unnamedCheckboxLocators(spec), [])
})

test("the guard catches the defect class, not just the two labels it has seen", () => {
  // Each mutation is a source this guard MUST reject. They are applied in
  // memory only. If any of these comes back clean, the guard has gone narrow
  // again — which is the failure mode that cost run 260913162141-ad63fd.
  const namedLocator = 'page.getByRole("checkbox", { name: "Avaliação pelo gestor" })'
  const mutations: ReadonlyArray<readonly [string, string]> = [
    [
      "the exact chain that failed on Avaliação pelo gestor",
      'page.getByText("Avaliação pelo gestor", { exact: true }).locator("..").getByRole("checkbox")',
    ],
    [
      "the same chain on a label this guard has never been told about",
      'page.getByText("Avaliação por pares", { exact: true }).locator("..").getByRole("checkbox")',
    ],
    [
      "single quotes and a line break between the links",
      "page.getByText('Avaliação por liderados')\n      .locator('..')\n      .getByRole('checkbox')",
    ],
    [
      "two levels up instead of one",
      'page.getByText("Autoavaliação").locator("../..").getByRole("checkbox")',
    ],
    [
      "the traversal parked in a variable first",
      'const card = page.getByText("Autoavaliação").locator("..")\n    const box = card.getByRole("checkbox")',
    ],
  ]

  for (const [description, replacement] of mutations) {
    const mutated = spec.replace(namedLocator, replacement)
    assert.notEqual(mutated, spec, `${description}: mutation did not apply`)
    const caught =
      ancestorTraversalCheckboxViolations(mutated).length > 0 ||
      unnamedCheckboxLocators(mutated).length > 0
    assert.ok(caught, `guard failed to catch: ${description}`)
  }

  // And it must not cry wolf: ancestor traversal that is NOT reaching a
  // checkbox is a different construct with a different risk, and the spec has
  // one (scoping the company timeline from its heading). Flagging it here would
  // push the next author to weaken the guard rather than obey it.
  assert.deepEqual(
    ancestorTraversalCheckboxViolations('page.getByRole("heading").locator("../..")'),
    []
  )
})

test("both perspective controls are named, and each is acted on explicitly", () => {
  assert.match(spec, /getByRole\("checkbox", \{ name: "Autoavaliação" \}\)/)
  assert.match(spec, /getByRole\("checkbox", \{ name: "Avaliação pelo gestor" \}\)/)
  assert.match(spec, /expect\(selfAssessmentCheckbox\)\.toBeVisible\(\)/)
  assert.match(spec, /selfAssessmentCheckbox\.isChecked\(\)/)
  assert.match(spec, /selfAssessmentCheckbox\.uncheck\(\)/)
  assert.match(spec, /expect\(managerAssessmentCheckbox\)\.toBeVisible\(\)/)
  assert.match(spec, /expect\(managerAssessmentCheckbox\)\.toBeChecked\(\)/)
  assert.match(spec, /perspective: "manager"/)
  assert.doesNotMatch(selfSpec, /selfAssessmentCheckbox|managerAssessmentCheckbox/)
  assert.match(selfSpec, /allow_self_assessment/)
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

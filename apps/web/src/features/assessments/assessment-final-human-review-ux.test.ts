import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { presentAssessmentPriority } from "./presenters/assessment-priority-presenter"
import type { AssessmentViewModel } from "./view-models/assessment-view-model"

const source = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8")

const assessment = (
  actionableResponseId: string | null
): AssessmentViewModel => ({
  id: "cycle-id-must-not-be-used",
  title: "Ciclo ativo",
  description: null,
  status: "active",
  statusLabel: "Em andamento",
  typeLabel: "Competências",
  periodLabel: "23/08/2026 a 31/12/2026",
  startDate: "2026-08-23",
  endDate: "2026-12-31",
  templateId: "template-id",
  actionableResponseId,
  isAnonymous: false,
  evaluatorFormats: ["Autoavaliação"],
})

test("actionable priority navigates to its Response and never substitutes the Cycle id", () => {
  const priority = presentAssessmentPriority([
    assessment("response-id-for-evaluator"),
  ])

  assert.equal(
    priority?.href,
    "/app/assessments/responses/response-id-for-evaluator"
  )
  assert.doesNotMatch(priority?.href ?? "", /cycle-id-must-not-be-used/)
  assert.equal(priority?.actionLabel, "Abrir avaliação")
})

test("active Cycle without an actionable evaluator Response exposes no broken CTA", () => {
  const priority = presentAssessmentPriority([assessment(null)])

  assert.equal(priority?.href, undefined)
  assert.equal(priority?.actionLabel, undefined)
})

test("choice renderers keep strong persisted, accessible and read-only selected states", () => {
  const scale = source(
    "./components/assessment-execution/renderers/scale-question-renderer.tsx"
  )
  const boolean = source(
    "./components/assessment-execution/renderers/boolean-question-renderer.tsx"
  )
  const card = source(
    "./components/assessment-execution/assessment-question-card.tsx"
  )

  for (const renderer of [scale, boolean]) {
    assert.match(renderer, /role="radiogroup"/)
    assert.match(renderer, /role="radio"/)
    assert.match(renderer, /aria-checked=\{selected\}/)
    assert.match(renderer, /font-bold/)
    assert.match(renderer, /border-2/)
    assert.match(renderer, /ring-2/)
    assert.match(renderer, /focus-visible:ring-2/)
    assert.match(renderer, /selecionado/)
  }

  assert.match(card, /value=\{answer\?\.score \?\? null\}/)
  assert.match(card, /value=\{answer\?\.answer_boolean \?\? null\}/)
  assert.match(
    card,
    /useState<number \| null>\(\s*answer\?\.score \?\? null/
  )
  assert.match(
    card,
    /useState<boolean \| null>\(\s*answer\?\.answer_boolean \?\? null/
  )
  assert.match(card, /disabled/)
})

import assert from "node:assert/strict"
import test from "node:test"

import type { PersonAssessmentResultDirectoryRow } from "@/features/assessment-feedback-read"

import {
  PERSON_ASSESSMENT_RESULTS_DEFAULT_LIMIT,
  presentPersonAssessmentResults,
} from "./presenters/person-assessment-results-presenter"

const personId = "55555555-5555-4555-8555-555555555555"

function row(
  overrides: Partial<PersonAssessmentResultDirectoryRow> = {}
): PersonAssessmentResultDirectoryRow {
  return {
    cycle_id: "10000000-0000-4000-8000-000000000001",
    cycle_name: "Ciclo 2026",
    model_name: "Modelo Anual",
    cycle_date: "2026-08-20",
    response_id: "20000000-0000-4000-8000-000000000001",
    perspective: "manager",
    response_status: "submitted",
    submitted_at: "2026-08-21T12:00:00+00:00",
    completed_at: null,
    overall_score: 80,
    ...overrides,
  }
}

test("preserves the boundary ordering instead of re-sorting", () => {
  // A 0118 já ordena por data terminal decrescente com desempate por id. Uma
  // segunda autoridade de ordenação aqui poderia divergir do banco em silêncio.
  const rows = [
    row({ response_id: "20000000-0000-4000-8000-00000000000a", submitted_at: "2026-01-01T00:00:00+00:00" }),
    row({ response_id: "20000000-0000-4000-8000-00000000000b", submitted_at: "2026-09-01T00:00:00+00:00" }),
    row({ response_id: "20000000-0000-4000-8000-00000000000c", submitted_at: "2026-05-01T00:00:00+00:00" }),
  ]

  const view = presentPersonAssessmentResults(rows, { personId })

  assert.deepEqual(
    view.items.map((item) => item.responseId),
    rows.map((source) => source.response_id)
  )
})

test("truncates to the limit without hiding the real total", () => {
  const rows = Array.from({ length: 8 }, (_, index) =>
    row({ response_id: `20000000-0000-4000-8000-00000000000${index}` })
  )

  const view = presentPersonAssessmentResults(rows, { personId, limit: 3 })

  assert.equal(view.items.length, 3)
  assert.equal(view.totalCount, 8)
  assert.equal(view.isTruncated, true)
  assert.equal(view.truncationLabel, "Exibindo as 3 avaliações mais recentes de 8.")
})

test("does not announce truncation when everything fits", () => {
  const view = presentPersonAssessmentResults([row(), row()], { personId, limit: 5 })

  assert.equal(view.isTruncated, false)
  assert.equal(view.truncationLabel, null)
  assert.equal(view.totalCount, 2)
})

test("defaults to the documented display limit", () => {
  assert.equal(PERSON_ASSESSMENT_RESULTS_DEFAULT_LIMIT, 5)

  const rows = Array.from({ length: 9 }, (_, index) =>
    row({ response_id: `20000000-0000-4000-8000-00000000000${index}` })
  )
  const view = presentPersonAssessmentResults(rows, { personId })

  assert.equal(view.items.length, PERSON_ASSESSMENT_RESULTS_DEFAULT_LIMIT)
})

test("an empty directory is empty, never a fabricated placeholder", () => {
  const view = presentPersonAssessmentResults([], { personId })

  assert.equal(view.isEmpty, true)
  assert.equal(view.totalCount, 0)
  assert.deepEqual(view.items, [])
  assert.equal(view.truncationLabel, null)
})

test("a qualitative Result reads as qualitative, never as zero", () => {
  const view = presentPersonAssessmentResults([row({ overall_score: null })], { personId })

  assert.equal(view.items[0].scoreLabel, "Resultado qualitativo")
  assert.notEqual(view.items[0].scoreLabel, "0,0%")
  assert.ok(view.items[0].scoreDescription)
})

test("a quantitative Result keeps the canonical percentage formatting", () => {
  const view = presentPersonAssessmentResults(
    [row({ overall_score: 66.666667 })],
    { personId }
  )

  assert.equal(view.items[0].scoreLabel, "66,7%")
  assert.equal(view.items[0].scoreDescription, null)
})

test("perspective labels come from the shared directory map", () => {
  const perspectives = ["self", "manager", "legacy_unknown"] as const
  const view = presentPersonAssessmentResults(
    perspectives.map((perspective, index) =>
      row({ perspective, response_id: `20000000-0000-4000-8000-00000000000${index}` })
    ),
    { personId }
  )

  assert.deepEqual(view.items.map((item) => item.perspectiveLabel), [
    "Autoavaliação",
    "Gestor",
    "Histórico — perspectiva não identificada",
  ])
})

test("status labels distinguish submitted from completed", () => {
  const view = presentPersonAssessmentResults(
    [
      row({ response_status: "submitted" }),
      row({
        response_id: "20000000-0000-4000-8000-000000000002",
        response_status: "completed",
      }),
    ],
    { personId }
  )

  assert.equal(view.items[0].statusLabel, "Enviada")
  assert.equal(view.items[1].statusLabel, "Concluída")
})

test("the displayed date degrades from submitted to completed to the Cycle date", () => {
  const view = presentPersonAssessmentResults(
    [
      row({ submitted_at: "2026-08-21T12:00:00+00:00", completed_at: "2026-08-25T12:00:00+00:00" }),
      row({
        response_id: "20000000-0000-4000-8000-000000000002",
        submitted_at: null,
        completed_at: "2026-08-25T12:00:00+00:00",
      }),
      row({
        response_id: "20000000-0000-4000-8000-000000000003",
        submitted_at: null,
        completed_at: null,
        cycle_date: "2026-07-04",
      }),
    ],
    { personId }
  )

  assert.deepEqual(view.items.map((item) => item.dateLabel), [
    "21/08/2026",
    "25/08/2026",
    "04/07/2026",
  ])
})

test("the result link carries only the allowlisted return context", () => {
  const view = presentPersonAssessmentResults([row()], { personId })
  const { href } = view.items[0]

  assert.equal(
    href,
    "/app/assessments/responses/20000000-0000-4000-8000-000000000001"
      + `?source=person-assessments&personId=${personId}`
  )
  assert.doesNotMatch(href, /returnTo|redirectTo|callbackUrl/)
  assert.doesNotMatch(href, /^https?:/)
})

test("the view model exposes no evaluator identity or private payload", () => {
  const view = presentPersonAssessmentResults([row()], { personId })
  const keys = Object.keys(view.items[0])

  for (const forbidden of [
    "evaluatorId",
    "evaluator_id",
    "answers",
    "questions",
    "comments",
    "rawScore",
    "raw_score",
    "visibility",
  ]) {
    assert.equal(keys.includes(forbidden), false, `vazou ${forbidden}`)
  }
})

test("a non-positive limit shows nothing while still reporting the total", () => {
  const view = presentPersonAssessmentResults([row(), row()], { personId, limit: 0 })

  assert.deepEqual(view.items, [])
  assert.equal(view.totalCount, 2)
  assert.equal(view.isTruncated, true)
})

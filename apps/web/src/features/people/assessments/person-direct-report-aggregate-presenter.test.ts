import assert from "node:assert/strict"
import test from "node:test"

import type { PersonDirectReportAggregateRow } from "@/features/assessment-feedback-read"

import {
  presentPersonDirectReportAggregate,
  SUPPRESSED_AGGREGATE_COPY,
} from "./presenters/person-direct-report-aggregate-presenter"

function row(
  overrides: Partial<PersonDirectReportAggregateRow> = {}
): PersonDirectReportAggregateRow {
  return {
    cycle_id: "10000000-0000-4000-8000-000000000001",
    cycle_name: "Ciclo 2026",
    model_name: "Modelo Anual",
    cycle_date: "2026-08-20",
    aggregate_score: 80,
    is_qualitative: false,
    suppressed: false,
    ...overrides,
  }
}

// A) quantitative -------------------------------------------------------------

test("quantitative: exposes the aggregated score with canonical percentage format", () => {
  const view = presentPersonDirectReportAggregate([row({ aggregate_score: 80 })])
  const item = view.items[0]
  assert.equal(item.kind, "quantitative")
  assert.equal(item.kind === "quantitative" && item.scoreLabel, "80,0%")
  assert.equal(item.cycleName, "Ciclo 2026")
  assert.equal(item.dateLabel, "20/08/2026")
})

// B) qualitative --------------------------------------------------------------

test("qualitative: reads as qualitative and never as zero", () => {
  const view = presentPersonDirectReportAggregate([
    row({ aggregate_score: null, is_qualitative: true, suppressed: false }),
  ])
  const item = view.items[0]
  assert.equal(item.kind, "qualitative")
  assert.equal(item.kind === "qualitative" && item.label, "Resultado qualitativo")
  assert.equal("scoreLabel" in item, false)
})

// C) suppressed A (eligible < 4) ---------------------------------------------

test("suppressed (A: eligible < 4): safe copy, no score", () => {
  const view = presentPersonDirectReportAggregate([
    row({ aggregate_score: null, is_qualitative: false, suppressed: true }),
  ])
  const item = view.items[0]
  assert.equal(item.kind, "suppressed")
  assert.equal(item.kind === "suppressed" && item.label, SUPPRESSED_AGGREGATE_COPY)
  assert.equal("scoreLabel" in item, false)
})

// D) suppressed D (eligible >= 4, scored in {1,2,3}) is INDISTINGUISHABLE from A

test("A and D are publicly indistinguishable in the presentation layer", () => {
  // O banco já colapsa A e D no MESMO shape de linha (suppressed=true,
  // is_qualitative=false, aggregate_score=null). O presenter só precisa preservar
  // essa indistinguibilidade — nada em kind/label/campos pode diferenciá-los.
  const caseA = presentPersonDirectReportAggregate([
    row({ cycle_id: "10000000-0000-4000-8000-00000000000a", aggregate_score: null, is_qualitative: false, suppressed: true }),
  ]).items[0]
  const caseD = presentPersonDirectReportAggregate([
    row({ cycle_id: "10000000-0000-4000-8000-00000000000d", aggregate_score: null, is_qualitative: false, suppressed: true }),
  ]).items[0]

  assert.equal(caseA.kind, caseD.kind)
  assert.equal(
    caseA.kind === "suppressed" && caseA.label,
    caseD.kind === "suppressed" && caseD.label
  )
  assert.deepEqual(
    Object.keys(caseA).filter((key) => key !== "cycleId").sort(),
    Object.keys(caseD).filter((key) => key !== "cycleId").sort()
  )
  assert.equal("scoreLabel" in caseA, false)
  assert.equal("scoreLabel" in caseD, false)
})

// E) suppressed precedence (fail-closed) -------------------------------------

test("suppressed wins even if a bug leaves a score on a suppressed row", () => {
  const view = presentPersonDirectReportAggregate([
    row({ suppressed: true, is_qualitative: false, aggregate_score: 80 }),
  ])
  const item = view.items[0]
  assert.equal(item.kind, "suppressed")
  assert.equal("scoreLabel" in item, false)
  assert.equal(item.kind === "suppressed" && item.label, SUPPRESSED_AGGREGATE_COPY)
  // nenhum valor do item é um rótulo de porcentagem (o score não vaza por outro campo)
  assert.equal(Object.values(item).some((value) => typeof value === "string" && value.includes("%")), false)
})

// F) inconsistent rows fail closed -------------------------------------------

test("qualitative wins over a stray score; a fully inconsistent row fails closed to suppressed", () => {
  // is_qualitative=true com score inesperado -> qualitative, sem expor score.
  const qualitative = presentPersonDirectReportAggregate([
    row({ suppressed: false, is_qualitative: true, aggregate_score: 80 }),
  ]).items[0]
  assert.equal(qualitative.kind, "qualitative")
  assert.equal("scoreLabel" in qualitative, false)

  // não suprimido, não qualitativo, sem score -> fail-closed para suppressed.
  const inconsistent = presentPersonDirectReportAggregate([
    row({ suppressed: false, is_qualitative: false, aggregate_score: null }),
  ]).items[0]
  assert.equal(inconsistent.kind, "suppressed")
  assert.equal("scoreLabel" in inconsistent, false)
})

// G) ordering -----------------------------------------------------------------

test("preserves the server order and never combines cycles", () => {
  const rows = [
    row({ cycle_id: "10000000-0000-4000-8000-000000000003", suppressed: true, is_qualitative: false, aggregate_score: null }),
    row({ cycle_id: "10000000-0000-4000-8000-000000000002", aggregate_score: 72.5 }),
    row({ cycle_id: "10000000-0000-4000-8000-000000000001", aggregate_score: null, is_qualitative: true }),
  ]
  const view = presentPersonDirectReportAggregate(rows)
  assert.deepEqual(
    view.items.map((item) => item.cycleId),
    rows.map((source) => source.cycle_id)
  )
  assert.deepEqual(view.items.map((item) => item.kind), ["suppressed", "quantitative", "qualitative"])
})

// I) numeric formatting -------------------------------------------------------

test("numeric formatting matches the product: 66.666667 / 0 / 100", () => {
  for (const [score, label] of [
    [66.666667, "66,7%"],
    [0, "0,0%"],
    [100, "100,0%"],
  ] as const) {
    const item = presentPersonDirectReportAggregate([row({ aggregate_score: score })]).items[0]
    assert.equal(item.kind, "quantitative")
    assert.equal(item.kind === "quantitative" && item.scoreLabel, label)
  }
})

// J) empty --------------------------------------------------------------------

test("an empty aggregate is empty, never a fabricated placeholder", () => {
  const view = presentPersonDirectReportAggregate([])
  assert.equal(view.isEmpty, true)
  assert.deepEqual(view.items, [])
})

// H) no-leak ------------------------------------------------------------------

test("no view-model item carries any cardinality or reidentification key", () => {
  const items = presentPersonDirectReportAggregate([
    row({ aggregate_score: 80 }),
    row({ cycle_id: "10000000-0000-4000-8000-000000000002", aggregate_score: null, is_qualitative: true }),
    row({ cycle_id: "10000000-0000-4000-8000-000000000003", aggregate_score: null, suppressed: true }),
  ]).items

  for (const item of items) {
    const keys = Object.keys(item)
    for (const forbidden of [
      "respondentCount", "respondent_count", "scoredCount", "scored_count",
      "responseId", "response_id", "evaluatorId", "evaluator_id",
      "evaluatorName", "evaluatorEmail", "rawScore", "raw_score",
      "answers", "questions", "comments", "competencies",
      "minScore", "maxScore", "distribution",
      "aggregateScore", "aggregate_score",
    ]) {
      assert.equal(keys.includes(forbidden), false, `vazou ${forbidden}`)
    }
  }
})

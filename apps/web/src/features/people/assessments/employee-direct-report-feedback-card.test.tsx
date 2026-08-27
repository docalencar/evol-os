import assert from "node:assert/strict"
import test from "node:test"

import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import type { PersonDirectReportAggregateRow } from "@/features/assessment-feedback-read"

import { EmployeeDirectReportFeedbackCard } from "./components/employee-direct-report-feedback-card"
import { presentPersonDirectReportAggregate } from "./presenters/person-direct-report-aggregate-presenter"

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

function render(rows: ReadonlyArray<PersonDirectReportAggregateRow>, isUnavailable = false) {
  return renderToStaticMarkup(
    <EmployeeDirectReportFeedbackCard
      feedback={presentPersonDirectReportAggregate(rows)}
      isUnavailable={isUnavailable}
    />
  )
}

test("quantitative renders the presenter scoreLabel, not a recomputed value", () => {
  const html = render([row({ aggregate_score: 66.666667 })])
  assert.match(html, /66,7%/)
  assert.doesNotMatch(html, /Resultado qualitativo|Dados insuficientes/)
})

test("qualitative renders the shared qualitative copy, never zero", () => {
  const html = render([row({ aggregate_score: null, is_qualitative: true })])
  assert.match(html, /Resultado qualitativo/)
  assert.doesNotMatch(html, /0,0%/)
})

test("suppressed renders the neutral anonymous copy", () => {
  const html = render([row({ aggregate_score: null, suppressed: true })])
  assert.match(html, /Dados insuficientes para exibição anônima/)
})

test("A and D produce byte-identical markup (indistinguishable)", () => {
  // Ambos chegam do banco como suppressed=true/is_qualitative=false/score=null.
  const htmlA = render([row({ aggregate_score: null, is_qualitative: false, suppressed: true })])
  const htmlD = render([row({ aggregate_score: null, is_qualitative: false, suppressed: true })])
  assert.equal(htmlA, htmlD)
  assert.doesNotMatch(htmlA, /%/)
})

test("no individual CTA, link or drill-down is rendered", () => {
  const html = render([
    row({ aggregate_score: 80 }),
    row({ cycle_id: "10000000-0000-4000-8000-000000000002", aggregate_score: null, is_qualitative: true }),
    row({ cycle_id: "10000000-0000-4000-8000-000000000003", aggregate_score: null, suppressed: true }),
  ])
  assert.doesNotMatch(html, /<a\s|href=|Ver resultado|Ver detalhe|responses\//)
})

test("no cardinality or reidentification data reaches the markup", () => {
  const html = render([
    row({ aggregate_score: 80 }),
    row({ cycle_id: "10000000-0000-4000-8000-000000000002", aggregate_score: null, suppressed: true }),
  ]).toLowerCase()
  for (const forbidden of [
    "respondent", "scored_count", "scoredcount", "response_id", "responseid",
    "evaluator", "raw_score", "rawscore", "subordinados que responderam",
    "faltam", "poucas respostas", "1–3", "1-3",
  ]) {
    assert.equal(html.includes(forbidden.toLowerCase()), false, `vazou ${forbidden}`)
  }
})

test("cycle order from the view model is preserved in the markup", () => {
  const html = render([
    row({ cycle_id: "10000000-0000-4000-8000-000000000001", cycle_name: "Ciclo Alpha", aggregate_score: 80 }),
    row({ cycle_id: "10000000-0000-4000-8000-000000000002", cycle_name: "Ciclo Bravo", aggregate_score: null, is_qualitative: true }),
    row({ cycle_id: "10000000-0000-4000-8000-000000000003", cycle_name: "Ciclo Charlie", aggregate_score: null, suppressed: true }),
  ])
  assert.ok(html.indexOf("Ciclo Alpha") < html.indexOf("Ciclo Bravo"))
  assert.ok(html.indexOf("Ciclo Bravo") < html.indexOf("Ciclo Charlie"))
})

test("empty state is neutral and invents no information", () => {
  const html = render([])
  assert.match(html, /Nenhum feedback agregado de subordinados/)
  assert.doesNotMatch(html, /%|Resultado qualitativo|Dados insuficientes/)
})

test("unavailable state fails closed without leaking internal errors", () => {
  const html = render([row()], true)
  assert.match(html, /não foi possível carregar o feedback de subordinados/i)
  assert.doesNotMatch(html, /PostgREST|SQLSTATE|42501|error\.message|rpc/i)
})

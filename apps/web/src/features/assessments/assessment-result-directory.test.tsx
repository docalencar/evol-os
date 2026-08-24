import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import type { AssessmentResultDirectoryRow } from "@/features/assessment-feedback-read"

import { AssessmentResultsDirectory } from "./components/assessment-results/assessment-results-directory"
import {
  formatAssessmentPercentagePoints,
  presentAssessmentResultDirectory,
} from "./presenters/assessment-result-directory-presenter"

const root = path.resolve(__dirname, "../..")

function row(overrides: Partial<AssessmentResultDirectoryRow>): AssessmentResultDirectoryRow {
  return {
    cycle_id: "10000000-0000-4000-8000-000000000001",
    cycle_name: "Ciclo anual",
    model_name: "Modelo congelado",
    cycle_date: "2026-08-20",
    response_id: "20000000-0000-4000-8000-000000000001",
    perspective: "self",
    response_status: "submitted",
    submitted_at: "2026-08-21T12:00:00+00:00",
    completed_at: null,
    overall_score: 75.5556,
    visibility: "full",
    result_available: true,
    ...overrides,
  }
}

describe("current Person Assessment result directory", () => {
  it("groups by Cycle and sorts perspectives and Manager multiplicity deterministically", () => {
    const directory = presentAssessmentResultDirectory([
      row({ response_id: "20000000-0000-4000-8000-000000000003", perspective: "manager", submitted_at: "2026-08-22T12:00:00+00:00", overall_score: 71 }),
      row({ response_id: "20000000-0000-4000-8000-000000000002", perspective: "manager", submitted_at: "2026-08-23T12:00:00+00:00", overall_score: 72 }),
      row({ response_id: "20000000-0000-4000-8000-000000000004", perspective: "legacy_unknown", overall_score: null }),
      row({}),
    ])

    assert.deepEqual(directory.cycles[0]?.results.map((result) => [
      result.perspectiveLabel,
      result.responseId,
    ]), [
      ["Autoavaliação", "20000000-0000-4000-8000-000000000001"],
      ["Gestor", "20000000-0000-4000-8000-000000000002"],
      ["Gestor", "20000000-0000-4000-8000-000000000003"],
      ["Histórico — perspectiva não identificada", "20000000-0000-4000-8000-000000000004"],
    ])
  })

  it("uses pt-BR score, preserves NULL and links with Response ID", () => {
    const directory = presentAssessmentResultDirectory([
      row({}),
      row({ response_id: "20000000-0000-4000-8000-000000000002", perspective: "manager", overall_score: null }),
    ])
    const markup = renderToStaticMarkup(<AssessmentResultsDirectory directory={directory} />)

    assert.match(markup, /75,6%/)
    assert.match(markup, /Resultado qualitativo/)
    assert.match(markup, /não possui perguntas com pontuação quantitativa/)
    assert.doesNotMatch(markup, /Sem resultado quantitativo|>0,0%<|N\/A|NULL/)
    assert.match(markup, /href="\/app\/assessments\/responses\/20000000-0000-4000-8000-000000000002\?source=assessments-results"/)
    assert.doesNotMatch(markup, /Média geral|Nota final|self|manager|legacy_unknown|Avaliador/)
  })

  it("compares exactly one Self and one Manager in the same Cycle", () => {
    const negative = presentAssessmentResultDirectory([
      row({ overall_score: 82 }),
      row({ response_id: "20000000-0000-4000-8000-000000000002", perspective: "manager", overall_score: 71 }),
    ])
    const positive = presentAssessmentResultDirectory([
      row({ overall_score: 71 }),
      row({ response_id: "20000000-0000-4000-8000-000000000002", perspective: "manager", overall_score: 82 }),
    ])
    const equal = presentAssessmentResultDirectory([
      row({ overall_score: 75 }),
      row({ response_id: "20000000-0000-4000-8000-000000000002", perspective: "manager", overall_score: 75 }),
    ])

    assert.equal(negative.cycles[0]?.comparison?.differenceLabel, "-11,0 pp")
    assert.equal(positive.cycles[0]?.comparison?.differenceLabel, "+11,0 pp")
    assert.equal(equal.cycles[0]?.comparison?.differenceLabel, "0,0 pp")
    assert.equal(formatAssessmentPercentagePoints(4.45), "+4,5 pp")
  })

  it("fails safely for qualitative, missing and inconsistent cardinalities", () => {
    const manager = row({
      response_id: "20000000-0000-4000-8000-000000000002",
      perspective: "manager",
      overall_score: 71,
    })
    const secondManager = row({
      response_id: "20000000-0000-4000-8000-000000000003",
      perspective: "manager",
      overall_score: 72,
    })
    const secondSelf = row({
      response_id: "20000000-0000-4000-8000-000000000004",
      perspective: "self",
      overall_score: 81,
    })

    for (const rows of [
      [row({ overall_score: null }), manager],
      [row({}), { ...manager, overall_score: null }],
    ]) {
      const cycle = presentAssessmentResultDirectory(rows).cycles[0]!
      assert.equal(cycle.comparison, null)
      assert.equal(cycle.comparisonUnavailableMessage, "Comparação quantitativa indisponível para este ciclo.")
    }

    assert.equal(presentAssessmentResultDirectory([row({})]).cycles[0]?.comparison, null)
    assert.equal(presentAssessmentResultDirectory([manager]).cycles[0]?.comparison, null)

    const multipleManager = presentAssessmentResultDirectory([row({}), manager, secondManager]).cycles[0]!
    assert.equal(multipleManager.comparison, null)
    assert.match(multipleManager.comparisonUnavailableMessage ?? "", /mais de uma avaliação de Gestor/)
    assert.equal(multipleManager.results.length, 3)

    const multipleSelf = presentAssessmentResultDirectory([row({}), secondSelf, manager]).cycles[0]!
    assert.equal(multipleSelf.comparison, null)
    assert.equal(multipleSelf.comparisonUnavailableMessage, "Comparação indisponível para este ciclo.")
    assert.equal(multipleSelf.results.length, 3)
  })

  it("never compares across Cycles and ignores legacy Results", () => {
    const directory = presentAssessmentResultDirectory([
      row({ overall_score: 82 }),
      row({
        cycle_id: "10000000-0000-4000-8000-000000000002",
        response_id: "20000000-0000-4000-8000-000000000002",
        perspective: "manager",
        overall_score: 71,
      }),
      row({
        response_id: "20000000-0000-4000-8000-000000000003",
        perspective: "legacy_unknown",
        overall_score: 40,
      }),
    ])

    assert.equal(directory.cycles.length, 2)
    assert.ok(directory.cycles.every((cycle) => cycle.comparison === null))
  })

  it("renders neutral, responsive and semantic comparison copy without replacing cards", () => {
    const directory = presentAssessmentResultDirectory([
      row({ overall_score: 82 }),
      row({ response_id: "20000000-0000-4000-8000-000000000002", perspective: "manager", overall_score: 71 }),
    ])
    const markup = renderToStaticMarkup(<AssessmentResultsDirectory directory={directory} />)

    assert.match(markup, /<h4[^>]*>Diferença de percepção<\/h4>/)
    assert.match(markup, /Diferença de percepção/)
    assert.match(markup, /não representa, por si só, um resultado positivo ou negativo/)
    assert.match(markup, /sm:grid-cols-3/)
    assert.match(markup, /-11,0 pp/)
    assert.equal((markup.match(/Ver resultado/g) ?? []).length, 2)
    assert.doesNotMatch(markup, /text-green|text-red|bg-green|bg-red|GAP|Avaliador|Liderados/)
  })

  it("renders a neutral empty state without implying hidden Results", () => {
    const markup = renderToStaticMarkup(
      <AssessmentResultsDirectory directory={presentAssessmentResultDirectory([])} />
    )
    assert.match(markup, /Você ainda não possui resultados disponíveis/)
    assert.doesNotMatch(markup, /oculto|indisponível por privacidade/)
  })

  it("wires the purpose-bound RPC and Assessments home without direct-report support", () => {
    const repository = fs.readFileSync(path.join(root, "features/assessment-feedback-read/repositories/assessment-feedback-read-repository.ts"), "utf8")
    const page = fs.readFileSync(path.join(root, "app/(dashboard)/app/assessments/page.tsx"), "utf8")
    const home = fs.readFileSync(path.join(root, "features/assessments/components/home/assessment-home.tsx"), "utf8")

    assert.match(repository, /get_current_person_assessment_result_directory_v1/)
    assert.match(repository, /z\.enum\(\["self", "manager", "legacy_unknown"\]\)/)
    assert.doesNotMatch(repository, /resultDirectoryRowSchema[\s\S]{0,700}evaluator/)
    assert.match(page, /getCurrentPersonAssessmentResultDirectoryReadModel/)
    assert.match(page, /isAdministrativeRole\(currentUser\.role\)/)
    assert.match(page, /canManageAssessments\s*\?\s*getAssessmentCatalogReadModel/)
    assert.match(home, /if \(!canManageAssessments\)/)
    assert.match(home, /title="Meus resultados"/)
  })
})

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import type { AssessmentResultDirectoryRow } from "@/features/assessment-feedback-read"

import { AssessmentResultsDirectory } from "./components/assessment-results/assessment-results-directory"
import { presentAssessmentResultDirectory } from "./presenters/assessment-result-directory-presenter"

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
    assert.match(markup, /href="\/app\/assessments\/responses\/20000000-0000-4000-8000-000000000002"/)
    assert.doesNotMatch(markup, /Média geral|Nota final|self|manager|legacy_unknown|Avaliador/)
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
    assert.match(home, /title="Meus resultados"/)
  })
})

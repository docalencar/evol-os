import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import type { AssessmentScoredResult } from "@/features/assessment-feedback-read"

import { AssessmentFeedbackCard } from "./components/assessment-feedback/assessment-feedback-card"
import { AssessmentResultUnavailableState } from "./components/assessment-feedback/assessment-result-unavailable-state"
import {
  formatAssessmentPercentage,
  presentAssessmentResult,
} from "./presenters/assessment-result-presenter"

const root = path.resolve(__dirname, "../..")

function result(
  overrides: Partial<AssessmentScoredResult> = {}
): AssessmentScoredResult {
  return {
    assessmentResponseId: "80000000-0000-4000-8000-000000000001",
    status: "submitted",
    perspective: "self",
    visibility: "full",
    formulaVersion: "response-scale-weighted-v1",
    overallScore: 75.5556,
    sections: [{
      snapshotSectionId: "60000000-0000-4000-8000-000000000001",
      sourceSectionId: "61000000-0000-4000-8000-000000000001",
      name: "Entrega",
      displayOrder: 0,
      weight: 2,
      score: 80,
    }, {
      snapshotSectionId: "60000000-0000-4000-8000-000000000002",
      sourceSectionId: "61000000-0000-4000-8000-000000000002",
      name: "Evidências",
      displayOrder: 1,
      weight: 1,
      score: null,
    }],
    questions: [{
      snapshotQuestionId: "70000000-0000-4000-8000-000000000001",
      sourceQuestionId: "71000000-0000-4000-8000-000000000001",
      snapshotSectionId: "60000000-0000-4000-8000-000000000001",
      prompt: "Entrega com qualidade?",
      type: "scale",
      required: true,
      weight: 2,
      displayOrder: 0,
      scaleMin: 0,
      scaleMax: 10,
      answerText: null,
      answerNumber: null,
      answerBoolean: null,
      rawScore: 8,
      normalizedScore: 80,
      competencyId: "72000000-0000-4000-8000-000000000001",
      competencyName: "Qualidade",
    }, {
      snapshotQuestionId: "70000000-0000-4000-8000-000000000002",
      sourceQuestionId: "71000000-0000-4000-8000-000000000002",
      snapshotSectionId: "60000000-0000-4000-8000-000000000001",
      prompt: "Faixa ajustada?",
      type: "scale",
      required: true,
      weight: 1,
      displayOrder: 1,
      scaleMin: 2,
      scaleMax: 5,
      answerText: null,
      answerNumber: null,
      answerBoolean: null,
      rawScore: 4,
      normalizedScore: 66.6667,
      competencyId: null,
      competencyName: null,
    }, {
      snapshotQuestionId: "70000000-0000-4000-8000-000000000003",
      sourceQuestionId: "71000000-0000-4000-8000-000000000003",
      snapshotSectionId: "60000000-0000-4000-8000-000000000002",
      prompt: "Recomendaria?",
      type: "yes_no",
      required: false,
      weight: 1,
      displayOrder: 2,
      scaleMin: null,
      scaleMax: null,
      answerText: null,
      answerNumber: null,
      answerBoolean: true,
      rawScore: null,
      normalizedScore: null,
      competencyId: null,
      competencyName: null,
    }, {
      snapshotQuestionId: "70000000-0000-4000-8000-000000000004",
      sourceQuestionId: "71000000-0000-4000-8000-000000000004",
      snapshotSectionId: "60000000-0000-4000-8000-000000000002",
      prompt: "Quantidade?",
      type: "number",
      required: false,
      weight: 1,
      displayOrder: 3,
      scaleMin: null,
      scaleMax: null,
      answerText: null,
      answerNumber: 42.5,
      answerBoolean: null,
      rawScore: null,
      normalizedScore: null,
      competencyId: null,
      competencyName: null,
    }, {
      snapshotQuestionId: "70000000-0000-4000-8000-000000000005",
      sourceQuestionId: "71000000-0000-4000-8000-000000000005",
      snapshotSectionId: "60000000-0000-4000-8000-000000000002",
      prompt: "Comentário?",
      type: "text",
      required: false,
      weight: 1,
      displayOrder: 4,
      scaleMin: null,
      scaleMax: null,
      answerText: "Evidência qualitativa preservada.",
      answerNumber: null,
      answerBoolean: null,
      rawScore: null,
      normalizedScore: null,
      competencyId: null,
      competencyName: null,
    }, {
      snapshotQuestionId: "70000000-0000-4000-8000-000000000006",
      sourceQuestionId: "71000000-0000-4000-8000-000000000006",
      snapshotSectionId: "60000000-0000-4000-8000-000000000002",
      prompt: "Opcional?",
      type: "text",
      required: false,
      weight: 1,
      displayOrder: 5,
      scaleMin: null,
      scaleMax: null,
      answerText: null,
      answerNumber: null,
      answerBoolean: null,
      rawScore: null,
      normalizedScore: null,
      competencyId: null,
      competencyName: null,
    }],
    competencies: [{
      competencyId: "72000000-0000-4000-8000-000000000001",
      competencyName: "Qualidade",
      score: 80,
    }],
    answers: [],
    ...overrides,
  }
}

describe("individual Assessment result presentation", () => {
  it("uses canonical pt-BR score and null formatting", () => {
    assert.equal(formatAssessmentPercentage(75.5556), "75,6%")
    assert.equal(formatAssessmentPercentage(80), "80,0%")
    assert.equal(formatAssessmentPercentage(66.6667), "66,7%")
    assert.equal(formatAssessmentPercentage(null), "Resultado qualitativo")
  })

  it("maps every perspective without exposing technical enums", () => {
    const labels = (["self", "manager", "direct_report", "legacy_unknown"] as const)
      .map((perspective) => presentAssessmentResult({
        result: result({ perspective }),
        mode: "evaluatee",
      }).perspective.label)

    assert.deepEqual(labels, [
      "Autoavaliação",
      "Gestor",
      "Liderados",
      "Histórico — perspectiva não identificada",
    ])
  })

  it("presents sections, scale context, other answer types and competency labels", () => {
    const view = presentAssessmentResult({ result: result(), mode: "evaluator" })

    assert.deepEqual(view.sections.map((section) => [section.scoreLabel, section.weightLabel]), [
      ["80,0%", "Peso relativo: 2"],
      ["Sem pontuação quantitativa nesta seção", "Peso relativo: 1"],
    ])
    assert.deepEqual(view.questions.map((question) => [
      question.answerLabel,
      question.scaleLabel,
      question.normalizedScoreLabel,
    ]), [
      ["8 de 10", "Escala: 0 a 10", "80,0%"],
      ["4 de 5", "Escala: 2 a 5", "66,7%"],
      ["Sim", null, null],
      ["42,5", null, null],
      ["Evidência qualitativa preservada.", null, null],
      ["Sem resposta", null, null],
    ])
    assert.equal(view.questions[0]?.competencyLabel, "Qualidade")
    assert.equal(view.competencies[0]?.scoreLabel, "80,0%")
  })

  it("renders only the collections authorized by each visibility payload", () => {
    const score = renderToStaticMarkup(<AssessmentFeedbackCard result={presentAssessmentResult({
      result: result({ visibility: "score", sections: [], questions: [], competencies: [], answers: [] }),
      mode: "evaluatee",
    })} />)
    assert.doesNotMatch(score, /Resultado por seção|Competências|Respostas e evidências/)

    const competencies = renderToStaticMarkup(<AssessmentFeedbackCard result={presentAssessmentResult({
      result: result({ visibility: "score_and_competencies", questions: [], answers: [] }),
      mode: "evaluatee",
    })} />)
    assert.match(competencies, /Competências/)
    assert.doesNotMatch(competencies, /Respostas e evidências/)

    const comments = renderToStaticMarkup(<AssessmentFeedbackCard result={presentAssessmentResult({
      result: result({
        visibility: "score_and_comments",
        sections: [],
        questions: [],
        competencies: [],
        answers: [{
          sourceQuestionId: "71000000-0000-4000-8000-000000000005",
          rawScore: null,
          answerText: "Comentário autorizado.",
          answerNumber: null,
          answerBoolean: null,
        }],
      }),
      mode: "evaluatee",
    })} />)
    assert.match(comments, /Comentário autorizado/)

    const full = renderToStaticMarkup(<AssessmentFeedbackCard result={presentAssessmentResult({
      result: result(),
      mode: "evaluatee",
    })} />)
    assert.match(full, /Entrega com qualidade|Resultado nesta avaliação/)

    const unavailable = renderToStaticMarkup(<AssessmentResultUnavailableState />)
    assert.match(unavailable, /Resultado ainda não disponível/)
    assert.match(unavailable, /Este resultado não está disponível conforme a política do ciclo/)
  })

  it("presents a valid NULL-score result as qualitative without converting it to zero", () => {
    const view = presentAssessmentResult({
      result: result({ overallScore: null }),
      mode: "evaluatee",
    })
    const markup = renderToStaticMarkup(<AssessmentFeedbackCard result={view} />)

    assert.equal(view.score.value, null)
    assert.match(markup, /Resultado qualitativo/)
    assert.match(markup, /não possui perguntas com pontuação quantitativa/)
    assert.doesNotMatch(markup, /Sem resultado quantitativo|>0,0%<|N\/A|NULL/)
  })

  it("keeps administrative and submitted evaluator modes read-only and identity-neutral", () => {
    const administrative = renderToStaticMarkup(<AssessmentFeedbackCard result={presentAssessmentResult({
      result: result(), mode: "administrative",
    })} />)
    const evaluator = renderToStaticMarkup(<AssessmentFeedbackCard result={presentAssessmentResult({
      result: result(), mode: "evaluator",
    })} />)

    assert.match(administrative, /Visualização administrativa|somente para consulta/)
    assert.match(evaluator, /Avaliação enviada|somente para consulta/)
    assert.doesNotMatch(administrative + evaluator, /evaluator_id|Avaliador:|Nome do avaliador/)
  })

  it("does not resurrect a raw-answer average or live-authoring fallback", () => {
    const markup = renderToStaticMarkup(<AssessmentFeedbackCard result={presentAssessmentResult({
      result: result(), mode: "evaluatee",
    })} />)
    const route = fs.readFileSync(
      path.join(root, "app/(dashboard)/app/assessments/responses/[id]/page.tsx"),
      "utf8"
    )
    const returnContext = fs.readFileSync(
      path.join(
        root,
        "app/(dashboard)/app/assessments/responses/[id]/assessment-result-return-context.ts"
      ),
      "utf8"
    )

    assert.match(markup, /75,6%/)
    assert.doesNotMatch(markup, /Nota média|6,0%/)
    assert.match(route, /getAssessmentScoredResultReadModel|getAssessmentEvaluateeScoredResultReadModel/)
    assert.doesNotMatch(route, /getAssessmentFeedback\(|router\.back|history\.back/)
    assert.match(route, /resolveAssessmentResultBackLink\(source, returnPersonId\)/)
    assert.match(returnContext, /href: "\/app\/assessments"/)
    assert.doesNotMatch(returnContext, /returnTo|redirectTo|callbackUrl|https?:\/\//)
  })
})

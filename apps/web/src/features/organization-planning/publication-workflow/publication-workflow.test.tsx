import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { PublicationConfirmStep } from "./publication-confirm-step"
import { PublicationImpactStep } from "./publication-impact-step"
import { PublicationProgress } from "./publication-progress"
import { PublicationResult } from "./publication-result"
import { PublicationSummaryStep } from "./publication-summary-step"
import { PublicationValidationStep } from "./publication-validation-step"

Object.assign(globalThis, { React })

const validation = Object.freeze({
  valid: true,
  errors: Object.freeze([]),
  warnings: Object.freeze([{ code: "projection.warning", message: "Revisar capacidade." }]),
})

test("presents the deterministic publication workflow without domain decisions", () => {
  const html = [
    renderToStaticMarkup(<PublicationProgress current={2} />),
    renderToStaticMarkup(<PublicationValidationStep status="approved" validation={validation} />),
    renderToStaticMarkup(<PublicationSummaryStep name="Expansão" version={4} />),
    renderToStaticMarkup(<PublicationImpactStep validation={validation} />),
    renderToStaticMarkup(<PublicationConfirmStep />),
    renderToStaticMarkup(<PublicationResult success message="Publicado." />),
  ].join("")

  assert.match(html, /Etapas da publicação/)
  assert.match(html, /Somente cenários aprovados/)
  assert.match(html, /Revisar capacidade/)
  assert.match(html, /Expansão/)
  assert.match(html, /Snapshot imutável/)
  assert.match(html, /handler repetirá todas as validações/)
  assert.match(html, /Publicação concluída/)
})

test("explains that a draft still requires approval", () => {
  const invalid = Object.freeze({
    valid: false,
    errors: Object.freeze([{ code: "planning.scenario.status.draft", message: "O cenário ainda precisa ser aprovado antes da publicação." }]),
    warnings: Object.freeze([]),
  })
  const html = renderToStaticMarkup(<PublicationValidationStep status="draft" validation={invalid} />)
  assert.match(html, /ainda precisa ser aprovado/)
})

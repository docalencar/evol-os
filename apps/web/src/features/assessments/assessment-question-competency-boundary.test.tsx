import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { AssessmentQuestionPreview } from "./components/assessment-preview/assessment-question-preview"
import { assessmentQuestionSchema } from "./schemas/assessment-question-schema"
import type { AssessmentQuestion } from "./types/assessment-question"

Object.assign(globalThis, { React })

const repository = readFileSync(
  new URL("./repositories/assessment-question-repository.ts", import.meta.url),
  "utf8"
)
const form = readFileSync(
  new URL("./components/assessment-question/assessment-question-form.tsx", import.meta.url),
  "utf8"
)
const createDialog = readFileSync(
  new URL("./components/assessment-question/assessment-question-create-dialog.tsx", import.meta.url),
  "utf8"
)
const editDialog = readFileSync(
  new URL("./components/assessment-question/assessment-question-edit-dialog.tsx", import.meta.url),
  "utf8"
)

const baseInput = {
  assessmentSectionId: "11000000-0000-4000-8000-000000000001",
  code: null,
  question: "Como esta competência é demonstrada?",
  helpText: null,
  questionType: "scale" as const,
  scaleMin: 1,
  scaleMax: 5,
  weight: 1,
  displayOrder: 1,
  required: true,
  active: true,
}

test("question schema accepts either one competency UUID or a generic null", () => {
  assert.equal(assessmentQuestionSchema.safeParse({ ...baseInput, competencyId: null }).success, true)
  assert.equal(assessmentQuestionSchema.safeParse({
    ...baseInput,
    competencyId: "11000000-0000-4000-8000-000000000002",
  }).success, true)
  assert.equal(assessmentQuestionSchema.safeParse({ ...baseInput, competencyId: "other-tenant" }).success, false)
})

test("repository mutations use only the three trusted question RPCs", () => {
  assert.match(repository, /create_tenant_assessment_question_v1/)
  assert.match(repository, /update_tenant_assessment_question_v1/)
  assert.match(repository, /archive_tenant_assessment_question_v1/)
  assert.doesNotMatch(repository, /\.insert\(|\.update\(|\.delete\(/)
  assert.doesNotMatch(repository, /employee_competenc/)
})

test("form offers an explicit optional competency selection", () => {
  assert.match(form, /Competência avaliada/)
  assert.match(form, /Nenhuma competência específica/)
  assert.match(form, /Opcional\. Vincule esta pergunta a uma competência do catálogo\./)
  assert.match(form, /competencyId: String\(formData\.get\("competencyId"\)/)
})

test("linked competency is visible in question preview while generic stays clean", () => {
  const linked: AssessmentQuestion = {
    id: "q-1", company_id: "company-1", assessment_section_id: "section-1",
    competency_id: "competency-1", competency_name: "Comunicação", code: null,
    question: "Como você se comunica?", help_text: null, question_type: "scale",
    scale_min: 1, scale_max: 5, weight: 1, display_order: 1,
    required: true, active: true,
  }
  const linkedHtml = renderToStaticMarkup(
    <AssessmentQuestionPreview question={linked} index={1} />
  )
  const genericHtml = renderToStaticMarkup(
    <AssessmentQuestionPreview
      question={{ ...linked, competency_id: null, competency_name: null }}
      index={1}
    />
  )

  assert.match(linkedHtml, /Competência: Comunicação/)
  assert.doesNotMatch(genericHtml, /Competência:/)
})

test("create and edit dialogs protect substantive input from implicit dismissal", () => {
  assert.match(createDialog, /dismissible=\{false\}/)
  assert.match(editDialog, /dismissible=\{false\}/)
  assert.match(createDialog, /onCancel=\{\(\) => setOpen\(false\)\}/)
  assert.match(editDialog, /onCancel=\{\(\) => setOpen\(false\)\}/)
  assert.match(form, />\s*Cancelar\s*</)
  assert.match(editDialog, /arquivada/)
})

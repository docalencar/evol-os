import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

import { resolveAssessmentResultBackLink } from "./assessment-result-return-context"

const page = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8")
const directoryPresenter = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../../../../../features/assessments/presenters/assessment-result-directory-presenter.ts"
  ),
  "utf8"
)
const assessmentHome = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../../../../../features/assessments/components/home/assessment-home.tsx"
  ),
  "utf8"
)

test("result-directory source returns deterministically to Meus resultados", () => {
  assert.deepEqual(resolveAssessmentResultBackLink("assessments-results"), {
    href: "/app/assessments#meus-resultados",
    label: "Voltar para meus resultados",
  })
  assert.match(directoryPresenter, /responses\/\$\{row\.response_id\}\?source=assessments-results/)
  assert.match(assessmentHome, /id="meus-resultados"/)
})

test("missing or invalid source uses the safe Assessments fallback", () => {
  for (const source of [undefined, "people", "https://example.com", "/app/people/123"]) {
    assert.deepEqual(resolveAssessmentResultBackLink(source), {
      href: "/app/assessments",
      label: "Voltar para avaliações",
    })
  }
})

test("Response page consumes only the allowlisted source and never browser history", () => {
  assert.match(page, /resolveAssessmentResultBackLink\(source\)/)
  assert.match(page, /href=\{backLink\.href\}/)
  assert.doesNotMatch(page, /router\.back|returnTo|redirectTo|callbackUrl/)
})

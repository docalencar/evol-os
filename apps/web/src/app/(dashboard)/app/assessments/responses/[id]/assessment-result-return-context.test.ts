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

const personDirectoryPresenter = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../../../../../features/people/assessments/presenters/person-assessment-results-presenter.ts"
  ),
  "utf8"
)
const personPage = fs.readFileSync(
  path.resolve(__dirname, "../../../people/[id]/page.tsx"),
  "utf8"
)

test("person-assessments source returns to the Person's Últimas avaliações", () => {
  assert.deepEqual(
    resolveAssessmentResultBackLink(
      "person-assessments",
      "55555555-5555-4555-8555-555555555555"
    ),
    {
      href: "/app/people/55555555-5555-4555-8555-555555555555#ultimas-avaliacoes",
      label: "Voltar para a pessoa",
    }
  )
  assert.match(
    personDirectoryPresenter,
    /responses\/\$\{row\.response_id\}`\s*\+\s*`\?source=person-assessments&personId=\$\{personId\}/
  )
  assert.match(personPage, /id="ultimas-avaliacoes"/)
})

test("person-assessments without a valid UUID falls back instead of guessing", () => {
  for (const personId of [
    undefined,
    "",
    "not-a-uuid",
    "../../app/settings",
    "https://example.com",
    "55555555-5555-4555-8555-555555555555 OR 1=1",
  ]) {
    assert.deepEqual(
      resolveAssessmentResultBackLink("person-assessments", personId),
      { href: "/app/assessments", label: "Voltar para avaliações" }
    )
  }
})

test("a personId without the matching source never changes the destination", () => {
  for (const source of [undefined, "people", "assessments-results"]) {
    const link = resolveAssessmentResultBackLink(
      source,
      "55555555-5555-4555-8555-555555555555"
    )
    assert.doesNotMatch(link.href, /\/app\/people\//)
  }
})

test("Response page consumes only the allowlisted source and never browser history", () => {
  assert.match(page, /resolveAssessmentResultBackLink\(source, returnPersonId\)/)
  assert.match(page, /href=\{backLink\.href\}/)
  assert.doesNotMatch(page, /router\.back|returnTo|redirectTo|callbackUrl/)
})

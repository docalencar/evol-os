import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const page = readFileSync(
  new URL("../../../app/(dashboard)/app/people/[id]/page.tsx", import.meta.url),
  "utf8",
)

test("profile route reads through tenant-safe management boundaries", () => {
  // Subject loads even when terminated (historical profile).
  assert.match(page, /getManagementPersonIncludingTerminated\(companyId, id\)/)
  // Employee competencies via the 0091 boundary (full source/validated_at/notes).
  assert.match(page, /getManagementEmployeeCompetencies\(companyId, id\)/)
  // Competency catalog, canonical person gaps and development plans via the
  // approved read boundaries.
  assert.match(page, /getManagementCompetencies\(companyId\)/)
  assert.match(page, /getCanonicalPersonCompetencyCoverage\(companyId, id\)/)
  assert.match(page, /getManagementDevelopmentPlans\(companyId\)/)
})

test("profile route drops the legacy terminated-excluding and direct-read loaders", () => {
  assert.doesNotMatch(page, /getManagementPerson\(companyId/)
  assert.doesNotMatch(page, /getEmployeeCompetenciesByEmployee/)
  assert.doesNotMatch(page, /getEmployeeCompetencyGaps/)
  assert.doesNotMatch(page, /\bgetCompetencies\(/)
  assert.doesNotMatch(page, /getDevelopmentPlansByEmployee/)
})

test("profile route performs no direct read on protected tables", () => {
  assert.doesNotMatch(
    page,
    /\.from\("(people|employee_competencies|competencies|position_competencies|development_plans)"\)/,
  )
  assert.doesNotMatch(page, /createClient|company_members/)
})

test("competency coverage comes from the canonical person boundary", () => {
  assert.match(page, /getCanonicalPersonCompetencyCoverage\(companyId, id\)/)
  assert.match(page, /presentPersonCompetencyCoverage\(/)
  assert.match(page, /PersonCompetencyGapCard/)
  assert.doesNotMatch(page, /getManagementCompetencyAssignments/)
  assert.doesNotMatch(page, /deriveCompetencyCoverage/)
  assert.doesNotMatch(page, /currentLevel:[\s\S]{0,100}\?\? 0/)
})

test("development plans are scoped to the subject employee", () => {
  assert.match(page, /allDevelopmentPlans\.filter\(/)
  assert.match(page, /plan\.employeeId === id/)
})

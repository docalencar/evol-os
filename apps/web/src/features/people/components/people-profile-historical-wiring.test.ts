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
  // Competency catalog, competency directory (for gaps) and development plans
  // via the approved read boundaries.
  assert.match(page, /getManagementCompetencies\(companyId\)/)
  assert.match(page, /getManagementCompetencyAssignments\(companyId\)/)
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

test("competency gaps are derived from safe read models via the existing rule", () => {
  // Gaps are computed from the subject's position requirements (directory) versus
  // the employee's current levels, reusing calculateCompetencyGap (no duplication).
  assert.match(page, /calculateCompetencyGap\(/)
  assert.match(page, /assignment\.record_type === "position"/)
  assert.match(page, /assignment\.position_id === employee\.position_id/)
})

test("development plans are scoped to the subject employee", () => {
  assert.match(page, /allDevelopmentPlans\.filter\(/)
  assert.match(page, /plan\.employeeId === id/)
})

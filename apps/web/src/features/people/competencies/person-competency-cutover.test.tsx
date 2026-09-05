import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import type { CanonicalPersonCompetencyCoverage } from "@/features/competencies/person-competency-gaps"

import { PersonCompetencyGapCard } from "./components/person-competency-gap-card"
import { presentPersonCompetencyCoverage } from "./presenters/present-person-competency-coverage"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

;(globalThis as typeof globalThis & { React: typeof React }).React = React

function coverage(
  overrides: Partial<CanonicalPersonCompetencyCoverage> = {}
): CanonicalPersonCompetencyCoverage {
  return {
    assignmentState: "active_assignment_with_expectations",
    personId: "person-1",
    positionId: "position-1",
    positionSeniorityProfileId: "profile-1",
    seniorityLevelId: "seniority-1",
    competencies: [
      {
        competencyId: "deficiency",
        competencyName: "Comunicação",
        expectedLevel: 4,
        currentLevel: 2,
        gap: 2,
        evidenceState: "assessed",
        weight: 3,
        required: true,
        competencyType: "technical",
        inherited: true,
        expectationSource: "base",
        expectationNotes: "Herdada",
        employeeCompetencyId: "evidence-1",
        evidenceSource: "manager",
        validatedAt: "2026-09-01T12:00:00.000Z",
      },
      {
        competencyId: "matched",
        competencyName: "Execução",
        expectedLevel: 3,
        currentLevel: 3,
        gap: 0,
        evidenceState: "assessed",
        weight: 1,
        required: false,
        competencyType: "behavioral",
        inherited: false,
        expectationSource: "override",
        expectationNotes: null,
        employeeCompetencyId: "evidence-2",
        evidenceSource: "self",
        validatedAt: null,
      },
      {
        competencyId: "exceeded",
        competencyName: "Liderança",
        expectedLevel: 2,
        currentLevel: 4,
        gap: -2,
        evidenceState: "assessed",
        weight: 2,
        required: true,
        competencyType: "leadership",
        inherited: false,
        expectationSource: "override",
        expectationNotes: null,
        employeeCompetencyId: "evidence-3",
        evidenceSource: "manager",
        validatedAt: null,
      },
      {
        competencyId: "unassessed",
        competencyName: "Estratégia",
        expectedLevel: 5,
        currentLevel: null,
        gap: null,
        evidenceState: "unassessed",
        weight: 1,
        required: true,
        competencyType: "technical",
        inherited: true,
        expectationSource: "base",
        expectationNotes: null,
        employeeCompetencyId: null,
        evidenceSource: null,
        validatedAt: null,
      },
    ],
    ...overrides,
  }
}

test("People route uses only the 0123 expectation boundary", () => {
  const page = read("../../../app/(dashboard)/app/people/[id]/page.tsx")
  const repository = read(
    "../../competencies/person-competency-gaps/repositories/person-competency-expectation-repository.ts"
  )

  assert.match(page, /getCanonicalPersonCompetencyCoverage\(companyId, id\)/)
  assert.doesNotMatch(page, /getManagementCompetencyAssignments/)
  assert.doesNotMatch(page, /deriveCompetencyCoverage/)
  assert.match(repository, /get_tenant_person_competency_expectations_v1/)
  assert.doesNotMatch(repository, /position_competencies|get_tenant_competency_directory_v1/)
})

test("canonical signs and missing evidence are presented without artificial zero", () => {
  const presentation = presentPersonCompetencyCoverage(coverage())

  assert.deepEqual(
    presentation.canonical.competencies.map(({ state, gap }) => [state, gap]),
    [
      ["deficiency", 2],
      ["meets_expectation", 0],
      ["exceeds_expectation", -2],
      ["unassessed", null],
    ]
  )
  assert.equal(presentation.legacyTalentCoverage.assessedCount, 3)
  assert.deepEqual(
    presentation.legacyTalentCoverage.gaps.map((gap) => gap.gap),
    [-2, 0, 2]
  )
  assert.equal(presentation.canonical.competencies[0]?.inherited, true)
  assert.equal(presentation.canonical.competencies[0]?.expectationSource, "base")
  assert.equal(presentation.canonical.competencies[1]?.expectationSource, "override")
})

test("People gap card renders canonical labels and unassessed evidence", () => {
  const html = renderToStaticMarkup(
    React.createElement(PersonCompetencyGapCard, {
      coverage: presentPersonCompetencyCoverage(coverage()).canonical,
    })
  )

  assert.match(html, /Gap de desenvolvimento/)
  assert.match(html, /Atende ao esperado/)
  assert.match(html, /Acima do esperado/)
  assert.match(html, /Não avaliada/)
  assert.match(html, /\+2/)
  assert.match(html, /Estratégia[\s\S]*>—<\/td>[\s\S]*>5<\/td>[\s\S]*>—<\/td>/)
})

test("People preserves every non-active assignment state explicitly", () => {
  const messages = {
    no_position: /ainda não possui um cargo/,
    missing_profile: /não possui um perfil de senioridade/,
    stale_assignment: /está desatualizada/,
    active_assignment_with_no_expectations: /não há competências configuradas/,
  } as const

  for (const [assignmentState, message] of Object.entries(messages)) {
    const canonical = coverage({
      assignmentState: assignmentState as keyof typeof messages,
      competencies: [],
    })
    const html = renderToStaticMarkup(
      React.createElement(PersonCompetencyGapCard, {
        coverage: presentPersonCompetencyCoverage(canonical).canonical,
      })
    )
    assert.match(html, message)
  }
})

test("presenter does not recompute inheritance or access persistence", () => {
  const presenter = read("./presenters/present-person-competency-coverage.ts")

  assert.doesNotMatch(presenter, /override\s*\?\?|baseRow|specificRow/)
  assert.doesNotMatch(presenter, /supabase|\.rpc\(|\.from\(/)
})

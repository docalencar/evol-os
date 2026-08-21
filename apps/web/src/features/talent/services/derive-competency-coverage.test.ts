import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { getDevelopmentPlanAiContext } from "@/features/development/services/get-development-plan-ai-context"

import { CompetencyGapCard } from "../components/competency-gap-card"
import { TalentSummaryCard } from "../components/talent-summary-card"
import type { CompetencyExpectation } from "../types/competency-coverage"
import { calculateTalentCard } from "./calculate-talent-card"
import { createEmployeeInsights } from "./create-employee-insights"
import { deriveCompetencyCoverage } from "./derive-competency-coverage"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const expectations: CompetencyExpectation[] = [
  {
    competencyId: "communication",
    competencyName: "Comunicação",
    expectedLevel: 3,
    weight: 2,
    required: true,
  },
  {
    competencyId: "leadership",
    competencyName: "Liderança",
    expectedLevel: 4,
    weight: 3,
    required: true,
  },
  {
    competencyId: "strategy",
    competencyName: "Estratégia",
    expectedLevel: 3,
    weight: 1,
    required: false,
  },
]

function coverage(levels: ReadonlyArray<{
  competencyId: string
  currentLevel: number
}>) {
  return deriveCompetencyCoverage({
    positionId: "position-1",
    expectations,
    employeeLevels: levels,
  })
}

test("derives no-position and not-configured without fabricating gaps", () => {
  const noPosition = deriveCompetencyCoverage({
    positionId: null,
    expectations: [],
    employeeLevels: [],
  })
  const notConfigured = deriveCompetencyCoverage({
    positionId: "position-1",
    expectations: [],
    employeeLevels: [],
  })

  assert.equal(noPosition.state, "no_position")
  assert.equal(notConfigured.state, "not_configured")
  assert.deepEqual(noPosition.gaps, [])
  assert.deepEqual(notConfigured.gaps, [])
})

test("missing levels are not assessed, never artificial zero or critical gaps", () => {
  const result = coverage([])

  assert.equal(result.state, "not_assessed")
  assert.equal(result.expectedCount, 3)
  assert.equal(result.assessedCount, 0)
  assert.equal(result.unassessedCount, 3)
  assert.equal(result.coverage, 0)
  assert.deepEqual(result.gaps, [])
  assert.equal(calculateTalentCard([...result.gaps]).adherence, 0)
})

test("partial coverage calculates gaps only from recorded levels", () => {
  const result = coverage([
    { competencyId: "communication", currentLevel: 4 },
    { competencyId: "leadership", currentLevel: 3 },
  ])

  assert.equal(result.state, "partially_assessed")
  assert.equal(result.assessedCount, 2)
  assert.equal(result.expectedCount, 3)
  assert.equal(result.unassessedCount, 1)
  assert.equal(result.coverage, 2 / 3)
  assert.deepEqual(result.gaps.map((gap) => gap.status), ["strength", "attention"])
  assert.deepEqual(
    result.unassessedCompetencies.map((item) => item.competencyId),
    ["strategy"]
  )
})

test("full coverage preserves every existing gap threshold and Talent formula", () => {
  const result = deriveCompetencyCoverage({
    positionId: "position-1",
    expectations: [
      ...expectations,
      {
        competencyId: "execution",
        competencyName: "Execução",
        expectedLevel: 4,
        weight: 1,
        required: true,
      },
    ],
    employeeLevels: [
      { competencyId: "communication", currentLevel: 4 },
      { competencyId: "leadership", currentLevel: 4 },
      { competencyId: "strategy", currentLevel: 2 },
      { competencyId: "execution", currentLevel: 2 },
    ],
  })

  assert.equal(result.state, "assessed")
  assert.deepEqual(
    result.gaps.map((gap) => [gap.gap, gap.status]),
    [[1, "strength"], [0, "matched"], [-1, "attention"], [-2, "critical"]]
  )
  assert.equal(calculateTalentCard([...result.gaps]).adherence, 75)
})

test("profile cards explain missing and partial coverage without false low adherence", () => {
  ;(
    globalThis as typeof globalThis & {
      React: typeof React
    }
  ).React = React

  const notAssessed = coverage([])
  const partial = coverage([
    { competencyId: "communication", currentLevel: 2 },
    { competencyId: "leadership", currentLevel: 4 },
  ])
  const notAssessedHtml = renderToStaticMarkup(
    React.createElement(TalentSummaryCard, {
      coverage: notAssessed,
      insights: createEmployeeInsights([]),
      positionId: "position-1",
    })
  )
  const partialHtml = renderToStaticMarkup(
    React.createElement(CompetencyGapCard, { coverage: partial })
  )

  assert.match(notAssessedHtml, /Competências ainda não avaliadas/)
  assert.doesNotMatch(notAssessedHtml, /30%|Crítico|gaps importantes/)
  assert.match(partialHtml, /Avaliação parcial/)
  assert.match(partialHtml, /2 de 3 competências avaliadas/)
  assert.match(partialHtml, /1 competência ainda não avaliada/)
})

test("development priority uses clear and consistent presentation copy", () => {
  const assessed = coverage([
    { competencyId: "communication", currentLevel: 3 },
    { competencyId: "leadership", currentLevel: 2 },
    { competencyId: "strategy", currentLevel: 3 },
  ])
  const html = renderToStaticMarkup(
    React.createElement(TalentSummaryCard, {
      coverage: assessed,
      insights: createEmployeeInsights([...assessed.gaps]),
      positionId: "position-1",
    })
  )
  const prioritiesCard = read(
    "../../development/components/development-priorities-card.tsx"
  )

  assert.match(html, /Prioridade de desenvolvimento/)
  assert.match(html, /Moderada/)
  assert.doesNotMatch(html, /Risco de desenvolvimento/)
  assert.match(prioritiesCard, /Prioridade moderada/)
  assert.doesNotMatch(prioritiesCard, /Média prioridade/)
})

test("only genuine negative gaps can feed the existing PDI suggestion", () => {
  const missingOnly = coverage([])
  const genuineGap = coverage([
    { competencyId: "communication", currentLevel: 2 },
  ])

  assert.deepEqual(
    getDevelopmentPlanAiContext({
      employeeName: "Ana",
      positionName: "Analista",
      competencyGaps: [...missingOnly.gaps],
    }).competencyGaps,
    []
  )
  assert.equal(
    getDevelopmentPlanAiContext({
      employeeName: "Ana",
      positionName: "Analista",
      competencyGaps: [...genuineGap.gaps],
    }).competencyGaps.length,
    1
  )
})

test("the slice adds no Assessment, DB, RPC or persistence coupling", () => {
  const service = read("./derive-competency-coverage.ts")
  const profile = read("../../../app/(dashboard)/app/people/[id]/page.tsx")
  assert.doesNotMatch(service, /assessment|assessment_answers|assessment_responses/i)
  assert.doesNotMatch(service, /\.from\(|\.rpc\(|insert\(|update\(/)
  assert.doesNotMatch(profile, /currentLevel:[\s\S]{0,100}\?\? 0/)
})

import assert from "node:assert/strict"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { ScenarioComparisonViewModel } from "./view-models"
import { ScenarioComparisonPage } from "./components"

const emptyStructuralComparison = {
  created: [],
  updated: [],
  archived: [],
  removed: [],
} as const

const emptyComparison: ScenarioComparisonViewModel = {
  departments: emptyStructuralComparison,
  teams: emptyStructuralComparison,
  positions: emptyStructuralComparison,
  employees: {
    added: [],
    moved: [],
    removed: [],
  },
  summary: {
    departments: { created: 0, updated: 0, archived: 0, removed: 0, total: 0 },
    teams: { created: 0, updated: 0, archived: 0, removed: 0, total: 0 },
    positions: { created: 0, updated: 0, archived: 0, removed: 0, total: 0 },
    employees: { added: 0, moved: 0, removed: 0, total: 0 },
    metrics: {
      headcount: { before: 0, after: 0, delta: 0 },
      vacancies: { before: 0, after: 0, delta: 0 },
      departments: { before: 0, after: 0, delta: 0 },
      positions: { before: 0, after: 0, delta: 0 },
    },
    totalChanges: 0,
  },
}

test("ScenarioComparisonPage renders its loading state", () => {
  const html = renderToStaticMarkup(createElement(ScenarioComparisonPage, {
    comparison: null,
    isLoading: true,
  }))

  assert.match(html, /aria-busy="true"/)
  assert.match(html, /Carregando comparação do cenário/)
})

test("ScenarioComparisonPage renders its empty state", () => {
  const html = renderToStaticMarkup(createElement(ScenarioComparisonPage, {
    comparison: emptyComparison,
  }))

  assert.match(html, /Nenhuma alteração encontrada/)
  assert.doesNotMatch(html, /Alterações por entidade/)
})

test("ScenarioComparisonPage renders summary and entity changes", () => {
  const comparison: ScenarioComparisonViewModel = {
    ...emptyComparison,
    departments: {
      ...emptyStructuralComparison,
      created: [{
        entity: {
          id: "department-1",
          name: "Produto",
          code: "PROD",
          description: null,
          parentDepartmentId: null,
          status: "active",
        },
      }],
    },
    summary: {
      ...emptyComparison.summary,
      departments: {
        created: 1,
        updated: 0,
        archived: 0,
        removed: 0,
        total: 1,
      },
      metrics: {
        ...emptyComparison.summary.metrics,
        departments: { before: 0, after: 1, delta: 1 },
      },
      totalChanges: 1,
    },
  }
  const html = renderToStaticMarkup(createElement(ScenarioComparisonPage, {
    comparison,
  }))

  assert.match(html, /1 alterações no cenário/)
  assert.match(html, /Alterações por entidade/)
  assert.match(html, /Produto/)
  assert.doesNotMatch(html, /salaryMass/)
})

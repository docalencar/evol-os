import React from "react"
import type { ScenarioComparisonViewModel } from "../view-models"
import { ComparisonEntitySections } from "./comparison-entity-sections"
import { ComparisonSummarySection } from "./comparison-summary-section"
import { ScenarioComparisonEmptyState } from "./scenario-comparison-empty-state"
import { ScenarioComparisonLoadingState } from "./scenario-comparison-loading-state"

type ScenarioComparisonPageProps = Readonly<{
  comparison: ScenarioComparisonViewModel | null
  isLoading?: boolean
}>

export function ScenarioComparisonPage({
  comparison,
  isLoading = false,
}: ScenarioComparisonPageProps) {
  if (isLoading) {
    return <ScenarioComparisonLoadingState />
  }

  const isEmpty = !comparison || comparison.summary.totalChanges === 0

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-blue-700">Planejamento organizacional</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Comparação do cenário
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Compare a estrutura base com o resultado projetado antes de seguir com
          qualquer decisão organizacional.
        </p>
      </header>

      {isEmpty ? (
        <ScenarioComparisonEmptyState />
      ) : (
        <>
          <ComparisonSummarySection summary={comparison.summary} />
          <ComparisonEntitySections comparison={comparison} />
        </>
      )}
    </main>
  )
}

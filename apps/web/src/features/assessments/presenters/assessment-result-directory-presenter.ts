import type { AssessmentResultDirectoryRow } from "@/features/assessment-feedback-read"

import { DIRECTORY_PERSPECTIVE_LABELS } from "./assessment-perspective-labels"
import {
  formatAssessmentPercentage,
  QUALITATIVE_RESULT_DESCRIPTION,
} from "./assessment-result-presenter"
import type {
  AssessmentPerspectiveComparisonViewModel,
  AssessmentResultDirectoryViewModel,
} from "../view-models/assessment-result-directory-view-model"

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const perspectiveOrder = { self: 0, manager: 1, legacy_unknown: 3 } as const

const percentagePointFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
})

export function formatAssessmentPercentagePoints(value: number): string {
  return `${percentagePointFormatter.format(value)} pp`
}

function presentComparison(
  rows: ReadonlyArray<AssessmentResultDirectoryRow>
): Readonly<{
  comparison: AssessmentPerspectiveComparisonViewModel | null
  comparisonUnavailableMessage: string | null
}> {
  const selfResults = rows.filter((row) => row.perspective === "self")
  const managerResults = rows.filter((row) => row.perspective === "manager")

  if (managerResults.length > 1) {
    return {
      comparison: null,
      comparisonUnavailableMessage:
        "Há mais de uma avaliação de Gestor neste ciclo. Consulte os resultados individualmente.",
    }
  }

  if (selfResults.length > 1) {
    return {
      comparison: null,
      comparisonUnavailableMessage: "Comparação indisponível para este ciclo.",
    }
  }

  const self = selfResults[0]
  const manager = managerResults[0]

  if (!self || !manager) {
    return { comparison: null, comparisonUnavailableMessage: null }
  }

  if (self.overall_score === null || manager.overall_score === null) {
    return {
      comparison: null,
      comparisonUnavailableMessage:
        "Comparação quantitativa indisponível para este ciclo.",
    }
  }

  const differencePoints = manager.overall_score - self.overall_score

  return {
    comparison: {
      self: {
        responseId: self.response_id,
        score: self.overall_score,
        scoreLabel: formatAssessmentPercentage(self.overall_score),
      },
      manager: {
        responseId: manager.response_id,
        score: manager.overall_score,
        scoreLabel: formatAssessmentPercentage(manager.overall_score),
      },
      differencePoints,
      differenceLabel: formatAssessmentPercentagePoints(differencePoints),
    },
    comparisonUnavailableMessage: null,
  }
}

function terminalDate(row: AssessmentResultDirectoryRow): string {
  return row.submitted_at ?? row.completed_at ?? `${row.cycle_date}T00:00:00Z`
}

export function presentAssessmentResultDirectory(
  rows: ReadonlyArray<AssessmentResultDirectoryRow>
): AssessmentResultDirectoryViewModel {
  const grouped = new Map<string, AssessmentResultDirectoryRow[]>()

  for (const row of rows) {
    const current = grouped.get(row.cycle_id) ?? []
    current.push(row)
    grouped.set(row.cycle_id, current)
  }

  const cycles = [...grouped.entries()].map(([cycleId, cycleRows]) => {
    const first = cycleRows[0]!
    const comparisonPresentation = presentComparison(cycleRows)
    const results = [...cycleRows]
      .sort((left, right) =>
        perspectiveOrder[left.perspective] - perspectiveOrder[right.perspective]
        || terminalDate(right).localeCompare(terminalDate(left))
        || left.response_id.localeCompare(right.response_id)
      )
      .map((row) => ({
        responseId: row.response_id,
        perspective: row.perspective,
        perspectiveLabel: DIRECTORY_PERSPECTIVE_LABELS[row.perspective],
        score: row.overall_score,
        scoreLabel: formatAssessmentPercentage(row.overall_score),
        scoreDescription: row.overall_score === null ? QUALITATIVE_RESULT_DESCRIPTION : null,
        statusLabel: row.response_status === "submitted" ? "Enviada" : "Concluída",
        submittedAtLabel: row.submitted_at || row.completed_at
          ? dateFormatter.format(new Date(row.submitted_at ?? row.completed_at!))
          : null,
        href: `/app/assessments/responses/${row.response_id}?source=assessments-results`,
        canOpen: true as const,
      }))

    return {
      cycleId,
      cycleName: first.cycle_name,
      modelName: first.model_name,
      dateLabel: dateFormatter.format(new Date(`${first.cycle_date}T00:00:00Z`)),
      results,
      ...comparisonPresentation,
      sortDate: cycleRows.reduce(
        (latest, row) => terminalDate(row) > latest ? terminalDate(row) : latest,
        terminalDate(first)
      ),
    }
  }).sort((left, right) =>
    right.sortDate.localeCompare(left.sortDate)
    || left.cycleId.localeCompare(right.cycleId)
  ).map((cycle) => ({
    cycleId: cycle.cycleId,
    cycleName: cycle.cycleName,
    modelName: cycle.modelName,
    dateLabel: cycle.dateLabel,
    results: cycle.results,
    comparison: cycle.comparison,
    comparisonUnavailableMessage: cycle.comparisonUnavailableMessage,
  }))

  return { cycles, isEmpty: cycles.length === 0 }
}

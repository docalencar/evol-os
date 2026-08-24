import type { AssessmentResultDirectoryRow } from "@/features/assessment-feedback-read"

import {
  formatAssessmentPercentage,
  QUALITATIVE_RESULT_DESCRIPTION,
} from "./assessment-result-presenter"
import type {
  AssessmentResultDirectoryViewModel,
} from "../view-models/assessment-result-directory-view-model"

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const perspectiveOrder = { self: 0, manager: 1, legacy_unknown: 3 } as const
const perspectiveLabels = {
  self: "Autoavaliação",
  manager: "Gestor",
  legacy_unknown: "Histórico — perspectiva não identificada",
} as const

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
    const results = [...cycleRows]
      .sort((left, right) =>
        perspectiveOrder[left.perspective] - perspectiveOrder[right.perspective]
        || terminalDate(right).localeCompare(terminalDate(left))
        || left.response_id.localeCompare(right.response_id)
      )
      .map((row) => ({
        responseId: row.response_id,
        perspective: row.perspective,
        perspectiveLabel: perspectiveLabels[row.perspective],
        score: row.overall_score,
        scoreLabel: formatAssessmentPercentage(row.overall_score),
        scoreDescription: row.overall_score === null ? QUALITATIVE_RESULT_DESCRIPTION : null,
        statusLabel: row.response_status === "submitted" ? "Enviada" : "Concluída",
        submittedAtLabel: row.submitted_at || row.completed_at
          ? dateFormatter.format(new Date(row.submitted_at ?? row.completed_at!))
          : null,
        href: `/app/assessments/responses/${row.response_id}`,
        canOpen: true as const,
      }))

    return {
      cycleId,
      cycleName: first.cycle_name,
      modelName: first.model_name,
      dateLabel: dateFormatter.format(new Date(`${first.cycle_date}T00:00:00Z`)),
      results,
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
  }))

  return { cycles, isEmpty: cycles.length === 0 }
}

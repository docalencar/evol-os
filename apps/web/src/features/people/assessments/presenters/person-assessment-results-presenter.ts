import type { PersonAssessmentResultDirectoryRow } from "@/features/assessment-feedback-read"
import { DIRECTORY_PERSPECTIVE_LABELS } from "@/features/assessments/presenters/assessment-perspective-labels"
import {
  formatAssessmentPercentage,
  QUALITATIVE_RESULT_DESCRIPTION,
} from "@/features/assessments/presenters/assessment-result-presenter"

import type {
  PersonAssessmentResultItemViewModel,
  PersonAssessmentResultsViewModel,
} from "../view-models/person-assessment-results-view-model"

/**
 * `timeZone` é fixado de propósito.
 *
 * `cycle_date` é um `date` puro, promovido a instante em UTC. Sem fixar o fuso,
 * `Intl` usa o fuso local do processo e um servidor com offset negativo exibe o
 * dia anterior — um Cycle de 04/07 vira 03/07. Fixar em UTC torna o rótulo
 * determinístico e igual ao que está gravado.
 */
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
})

export const PERSON_ASSESSMENT_RESULTS_DEFAULT_LIMIT = 5

const statusLabels = {
  submitted: "Enviada",
  completed: "Concluída",
} as const

/**
 * Data exibida para um Result. A fronteira já devolve `submitted_at` e
 * `completed_at`; quando ambos são nulos — Result histórico sem carimbo — cai
 * para a data do Cycle, que é `not null` no contrato. Nunca inventa "hoje".
 */
function terminalDate(row: PersonAssessmentResultDirectoryRow): string {
  return row.submitted_at ?? row.completed_at ?? `${row.cycle_date}T00:00:00Z`
}

function presentItem(
  row: PersonAssessmentResultDirectoryRow,
  personId: string
): PersonAssessmentResultItemViewModel {
  return {
    responseId: row.response_id,
    cycleId: row.cycle_id,
    cycleName: row.cycle_name,
    modelName: row.model_name,
    perspectiveLabel: DIRECTORY_PERSPECTIVE_LABELS[row.perspective],
    scoreLabel: formatAssessmentPercentage(row.overall_score),
    scoreDescription:
      row.overall_score === null ? QUALITATIVE_RESULT_DESCRIPTION : null,
    statusLabel: statusLabels[row.response_status],
    dateLabel: dateFormatter.format(new Date(terminalDate(row))),
    href:
      `/app/assessments/responses/${row.response_id}`
      + `?source=person-assessments&personId=${personId}`,
  }
}

/**
 * Projeta o directory administrativo da Pessoa em "Últimas avaliações".
 *
 * A ORDEM É PRESERVADA. A fronteira 0118 já ordena por data terminal
 * decrescente com desempate determinístico por `response.id`; reordenar aqui
 * criaria uma segunda autoridade de ordenação que poderia divergir da do banco
 * em silêncio. O presenter só corta.
 *
 * O corte também não é escondido: `totalCount` continua sendo o total oficial
 * devolvido, para que a superfície nunca sugira que a Pessoa tem menos Results
 * do que realmente tem.
 */
export function presentPersonAssessmentResults(
  rows: ReadonlyArray<PersonAssessmentResultDirectoryRow>,
  options: Readonly<{ personId: string; limit?: number }>
): PersonAssessmentResultsViewModel {
  const limit = options.limit ?? PERSON_ASSESSMENT_RESULTS_DEFAULT_LIMIT
  const totalCount = rows.length
  const items = rows
    .slice(0, Math.max(limit, 0))
    .map((row) => presentItem(row, options.personId))
  const isTruncated = totalCount > items.length

  return {
    items,
    totalCount,
    isTruncated,
    truncationLabel: isTruncated
      ? `Exibindo as ${items.length} avaliações mais recentes de ${totalCount}.`
      : null,
    isEmpty: totalCount === 0,
  }
}

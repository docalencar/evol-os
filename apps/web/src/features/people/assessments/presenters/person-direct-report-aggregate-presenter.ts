import type { PersonDirectReportAggregateRow } from "@/features/assessment-feedback-read"
import {
  formatAssessmentPercentage,
  QUALITATIVE_RESULT_COPY,
} from "@/features/assessments/presenters/assessment-result-presenter"

import type {
  PersonDirectReportAggregateItemViewModel,
  PersonDirectReportAggregateViewModel,
} from "../view-models/person-direct-report-aggregate-view-model"

/**
 * `timeZone` é fixado em UTC de propósito — mesma razão do presenter de "Últimas
 * avaliações": `cycle_date` é um `date` puro; sem fixar o fuso, um servidor com
 * offset negativo exibiria o dia anterior. Rótulo determinístico e igual ao que
 * está gravado.
 */
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
})

/**
 * Copy de estado suprimido. Fixada pelo Implementation Plan da B2-C (§5): NÃO
 * pode revelar quantas respostas existem, quantas faltam, se há score ou se é o
 * caso A ou D — apenas que não há base suficiente para exibição anônima.
 */
export const SUPPRESSED_AGGREGATE_COPY = "Dados insuficientes para exibição anônima"

function presentItem(
  row: PersonDirectReportAggregateRow
): PersonDirectReportAggregateItemViewModel {
  const base = {
    cycleId: row.cycle_id,
    cycleName: row.cycle_name,
    modelName: row.model_name,
    dateLabel: dateFormatter.format(new Date(`${row.cycle_date}T00:00:00Z`)),
  } as const

  // Precedência FAIL-CLOSED. `suppressed` vence tudo: mesmo que um bug do banco
  // preencha `aggregate_score` num ciclo suprimido, o score NUNCA é exposto. Uma
  // linha inconsistente (não suprimida, não qualitativa, sem score) também cai em
  // `suppressed` — a saída pública mais protetora — em vez de inventar uma nota.
  if (row.suppressed) {
    return { ...base, kind: "suppressed", label: SUPPRESSED_AGGREGATE_COPY }
  }
  if (row.is_qualitative) {
    return { ...base, kind: "qualitative", label: QUALITATIVE_RESULT_COPY }
  }
  if (row.aggregate_score !== null) {
    return { ...base, kind: "quantitative", scoreLabel: formatAssessmentPercentage(row.aggregate_score) }
  }
  return { ...base, kind: "suppressed", label: SUPPRESSED_AGGREGATE_COPY }
}

/**
 * Projeta o agregado anônimo de subordinados de uma Pessoa em itens de
 * apresentação, um por Cycle.
 *
 * A ORDEM DO SERVIDOR É PRESERVADA. A fronteira 0119 já ordena por `cycle_date`
 * desc com desempate por `cycle_id`; reordenar aqui criaria uma segunda
 * autoridade de ordenação que poderia divergir do banco em silêncio.
 *
 * Cada ciclo é um anonymity set independente: o presenter NÃO agrega, NÃO
 * recalcula score e NÃO combina ciclos.
 */
export function presentPersonDirectReportAggregate(
  rows: ReadonlyArray<PersonDirectReportAggregateRow>
): PersonDirectReportAggregateViewModel {
  return {
    items: rows.map(presentItem),
    isEmpty: rows.length === 0,
  }
}

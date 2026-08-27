import React from "react"

import type { PersonDirectReportAggregateViewModel } from "../view-models/person-direct-report-aggregate-view-model"

/**
 * Superfície SEPARADA para feedback de subordinados/liderados (`direct_report`),
 * agregado e ANÔNIMO por Cycle — fronteira 0119 (PD-022 / ADR-0018).
 *
 * Terceira dimensão independente: NÃO se mistura com "Últimas avaliações" nem com
 * Self × Manager, e NÃO é uma avaliação individual. Por construção não há CTA
 * individual, `href`, identidade de avaliador nem cardinalidade — o ViewModel da
 * Phase 3 já é a autoridade de apresentação e não carrega esses dados. Este
 * componente é UI fina: só escolhe o texto por `kind`, sem calcular ou agregar.
 *
 * Os dois casos internos de supressão (A: `eligible < 4`; D: `eligible >= 4` com
 * `scored ∈ {1,2,3}`) chegam como o MESMO `kind: "suppressed"` e renderizam
 * exatamente a mesma célula — nada aqui os distingue.
 */
type EmployeeDirectReportFeedbackCardProps = Readonly<{
  feedback: PersonDirectReportAggregateViewModel
  /**
   * true quando a fronteira não pôde ser lida. Diferente de "não há feedback": a
   * superfície diz que não sabe agora, em vez de afirmar ausência.
   */
  isUnavailable?: boolean
}>

export function EmployeeDirectReportFeedbackCard({
  feedback,
  isUnavailable = false,
}: EmployeeDirectReportFeedbackCardProps) {
  if (isUnavailable) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar o feedback de subordinados agora. Tente
          novamente em instantes.
        </p>
      </div>
    )
  }

  if (feedback.isEmpty) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhum feedback agregado de subordinados disponível para esta pessoa.
        </p>
      </div>
    )
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {feedback.items.map((item) => (
        <li key={item.cycleId} className="flex min-w-0">
          <article className="flex min-w-0 grow flex-col rounded-lg border bg-card p-4">
            <h3 className="break-words text-base font-semibold">
              {item.cycleName}
            </h3>

            <p className="text-sm text-muted-foreground">{item.modelName}</p>

            {item.kind === "quantitative" ? (
              <p className="mt-3 break-words text-3xl font-bold">
                {item.scoreLabel}
              </p>
            ) : (
              <p className="mt-3 break-words text-sm text-muted-foreground">
                {item.label}
              </p>
            )}

            <p className="mt-2 text-sm text-muted-foreground">
              {item.dateLabel}
            </p>
          </article>
        </li>
      ))}
    </ul>
  )
}

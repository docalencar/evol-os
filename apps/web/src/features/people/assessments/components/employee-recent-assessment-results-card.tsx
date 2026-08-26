import Link from "next/link"

import type { PersonAssessmentResultsViewModel } from "../view-models/person-assessment-results-view-model"

type EmployeeRecentAssessmentResultsCardProps = Readonly<{
  results: PersonAssessmentResultsViewModel
  /**
   * true quando a fronteira administrativa não pôde ser lida. É diferente de
   * "não há resultados": a superfície precisa dizer que não sabe, em vez de
   * afirmar um histórico vazio que pode não ser verdade.
   */
  isUnavailable?: boolean
}>

export function EmployeeRecentAssessmentResultsCard({
  results,
  isUnavailable = false,
}: EmployeeRecentAssessmentResultsCardProps) {
  if (isUnavailable) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar as avaliações desta pessoa agora. Tente
          novamente em instantes.
        </p>
      </div>
    )
  }

  if (results.isEmpty) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma avaliação oficial disponível para esta pessoa.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.items.map((result) => (
          <li key={result.responseId} className="flex min-w-0">
            <article className="flex min-w-0 grow flex-col rounded-lg border bg-card p-4">
              <p className="text-sm font-medium text-primary">
                {result.perspectiveLabel}
              </p>

              <h3 className="mt-1 break-words text-base font-semibold">
                {result.cycleName}
              </h3>

              <p className="text-sm text-muted-foreground">
                {result.modelName}
              </p>

              <p className="mt-3 break-words text-3xl font-bold">
                {result.scoreLabel}
              </p>

              {result.scoreDescription ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {result.scoreDescription}
                </p>
              ) : null}

              <p className="mt-2 text-sm text-muted-foreground">
                {`${result.statusLabel} em ${result.dateLabel}`}
              </p>

              <Link
                href={result.href}
                className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Ver resultado
              </Link>
            </article>
          </li>
        ))}
      </ul>

      {results.truncationLabel ? (
        <p className="text-sm text-muted-foreground">
          {results.truncationLabel}
        </p>
      ) : null}
    </div>
  )
}

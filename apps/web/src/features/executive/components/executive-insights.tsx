import type { ExecutiveBriefViewModel } from "../types"

type ExecutiveInsightsProps = {
  brief: ExecutiveBriefViewModel
}

export function ExecutiveInsights({
  brief,
}: ExecutiveInsightsProps) {
  const hasSuggestions =
    Number.parseInt(brief.aiSuggestionsLabel, 10) > 0

  return (
    <section
      aria-labelledby="executive-insights-title"
      className="rounded-xl border bg-card p-6"
    >
      <div>
        <h2
          id="executive-insights-title"
          className="text-lg font-semibold"
        >
          Executive Insights
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Recomendações e interpretações executivas com base nos dados
          disponíveis.
        </p>
      </div>

      {hasSuggestions ? (
        <div className="mt-4 rounded-lg border bg-background p-4">
          <p className="font-medium">
            Sugestões disponíveis
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Existem {brief.aiSuggestionsLabel} sugestão(ões) aguardando
            análise no contexto executivo.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed p-4">
          <p className="font-medium">
            Nenhum insight disponível
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Os insights aparecerão aqui quando houver recomendações
            consolidadas para a liderança.
          </p>
        </div>
      )}
    </section>
  )
}
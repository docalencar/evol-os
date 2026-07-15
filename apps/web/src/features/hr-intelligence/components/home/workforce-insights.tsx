import type { WorkforceInsight } from "../../types/workforce-insight"

type WorkforceInsightsProps = {
  insights: WorkforceInsight[]
}

export function WorkforceInsights({
  insights,
}: WorkforceInsightsProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          Insights do RH
        </h2>

        <p className="text-sm text-muted-foreground">
          Principais destaques da organização.
        </p>
      </div>

      {insights.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum insight disponível.
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <article
              key={insight.title}
              className="rounded-xl border bg-card p-5"
            >
              <h3 className="font-semibold">
                {insight.title}
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                {insight.description}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

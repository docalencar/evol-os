type AssessmentSmartInsightsCardProps = {
  insights: {
    completedSections: number
    pendingSections: number
    averageScore: number | null
  }
}

export function AssessmentSmartInsightsCard({
  insights,
}: AssessmentSmartInsightsCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-4 text-base font-semibold">
        📊 Insights
      </h3>

      <div className="space-y-4">
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">
            Seções concluídas
          </p>

          <p className="mt-1 text-2xl font-bold">
            {insights.completedSections}
          </p>
        </div>

        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">
            Pendentes
          </p>

          <p className="mt-1 text-2xl font-bold">
            {insights.pendingSections}
          </p>
        </div>

        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">
            Nota média
          </p>

          <p className="mt-1 text-2xl font-bold">
            {insights.averageScore ?? "--"}
          </p>
        </div>

        <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          Continue respondendo para desbloquear
          recomendações inteligentes.
        </div>
      </div>
    </div>
  )
}

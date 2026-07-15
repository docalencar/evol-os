type EmployeeAssessmentsSummaryCardProps = {
  completedAssessments: number
  averageScore: number | null
  latestAssessmentAt: string | null
}

export function EmployeeAssessmentsSummaryCard({
  completedAssessments,
  averageScore,
  latestAssessmentAt,
}: EmployeeAssessmentsSummaryCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          Avaliações
        </h2>

        <p className="text-sm text-muted-foreground">
          Resumo das avaliações do colaborador.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">
            Concluídas
          </p>

          <p className="text-2xl font-semibold">
            {completedAssessments}
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">
            Média
          </p>

          <p className="text-2xl font-semibold">
            {averageScore?.toFixed(1) ?? "-"}
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">
            Última
          </p>

          <p className="text-sm font-medium">
            {latestAssessmentAt ?? "-"}
          </p>
        </div>
      </div>
    </div>
  )
}

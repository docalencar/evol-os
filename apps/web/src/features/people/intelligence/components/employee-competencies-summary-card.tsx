type EmployeeCompetenciesSummaryCardProps = {
  strongestCompetency: string | null
  weakestCompetency: string | null
}

export function EmployeeCompetenciesSummaryCard({
  strongestCompetency,
  weakestCompetency,
}: EmployeeCompetenciesSummaryCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-5">

      <div>
        <h2 className="text-lg font-semibold">
          Competências
        </h2>

        <p className="text-sm text-muted-foreground">
          Principais destaques de competências.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <p className="text-xs text-muted-foreground">
          Principal ponto forte
        </p>

        <p className="mt-1 font-semibold">
          {strongestCompetency ?? "-"}
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <p className="text-xs text-muted-foreground">
          Principal oportunidade
        </p>

        <p className="mt-1 font-semibold">
          {weakestCompetency ?? "-"}
        </p>
      </div>

    </div>
  )
}

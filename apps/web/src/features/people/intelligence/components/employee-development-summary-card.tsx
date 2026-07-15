type EmployeeDevelopmentSummaryCardProps = {
  activePlans: number
  completedPlans: number
}

export function EmployeeDevelopmentSummaryCard({
  activePlans,
  completedPlans,
}: EmployeeDevelopmentSummaryCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-5">

      <div>
        <h2 className="text-lg font-semibold">
          Desenvolvimento
        </h2>

        <p className="text-sm text-muted-foreground">
          Situação atual dos planos de desenvolvimento.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">

        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">
            PDIs ativos
          </p>

          <p className="mt-2 text-3xl font-semibold">
            {activePlans}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">
            PDIs concluídos
          </p>

          <p className="mt-2 text-3xl font-semibold">
            {completedPlans}
          </p>
        </div>

      </div>

    </div>
  )
}

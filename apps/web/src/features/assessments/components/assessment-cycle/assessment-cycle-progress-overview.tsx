import type { AssessmentCycleProgressViewModel } from "../../view-models/assessment-cycle-progress-view-model"

type AssessmentCycleProgressOverviewProps = {
  participants: number
  progress: AssessmentCycleProgressViewModel
}

type MetricCardProps = {
  label: string
  value: number
  className?: string
}

function MetricCard({
  label,
  value,
  className = "",
}: MetricCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">
        {label}
      </p>

      <p
        className={[
          "mt-2 text-3xl font-bold",
          className,
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  )
}

export function AssessmentCycleProgressOverview({
  participants,
  progress,
}: AssessmentCycleProgressOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">
              Progresso geral
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {progress.finished} de {progress.total} avaliações
              enviadas ou concluídas.
            </p>
          </div>

          <p className="text-3xl font-bold">
            {progress.completionPercentage}%
          </p>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{
              width: `${progress.completionPercentage}%`,
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Participantes"
          value={participants}
        />

        <MetricCard
          label="Avaliações"
          value={progress.total}
        />

        <MetricCard
          label="Não iniciadas"
          value={progress.notStarted}
          className="text-amber-600"
        />

        <MetricCard
          label="Em andamento"
          value={progress.inProgress}
          className="text-blue-600"
        />

        <MetricCard
          label="Enviadas"
          value={progress.submitted}
          className="text-emerald-600"
        />

        <MetricCard
          label="Concluídas"
          value={progress.completed}
          className="text-emerald-700"
        />

        <MetricCard
          label="Pendentes"
          value={progress.pending}
          className="text-amber-700"
        />

        <MetricCard
          label="Canceladas"
          value={progress.cancelled}
          className="text-red-600"
        />
      </div>
    </div>
  )
}

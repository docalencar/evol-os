import Link from "next/link"

import type { AttentionPriority } from "../../types/attention-item"
import type { AttentionQueueViewModel } from "../../view-models/attention-queue-view-model"

type AttentionQueueProps = {
  viewModel: AttentionQueueViewModel
}

const PRIORITY_CLASS_NAMES: Record<
  AttentionPriority,
  string
> = {
  critical:
    "border-red-200 bg-red-50 text-red-700",
  high:
    "border-orange-200 bg-orange-50 text-orange-700",
  medium:
    "border-amber-200 bg-amber-50 text-amber-700",
  low:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
}

export function AttentionQueue({
  viewModel,
}: AttentionQueueProps) {
  if (viewModel.empty) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <h2 className="font-semibold">
          Nenhuma atenção necessária
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Sua equipe não possui prioridades identificadas neste
          momento.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {viewModel.topPriority && (
        <section className="rounded-xl border-2 border-primary bg-card p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Today&apos;s Focus
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              {viewModel.topPriority.employeeName}
            </h2>

            <p className="mt-2 text-muted-foreground">
              {viewModel.topPriority.decisionSummary}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {viewModel.topPriority.recommendedActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Pessoas na fila
          </p>

          <p className="mt-2 text-3xl font-bold">
            {viewModel.total}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Críticas
          </p>

          <p className="mt-2 text-3xl font-bold text-red-600">
            {viewModel.critical}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Altas
          </p>

          <p className="mt-2 text-3xl font-bold text-orange-600">
            {viewModel.high}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Médias
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-600">
            {viewModel.medium}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Baixas
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {viewModel.low}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {viewModel.items.map((item) => (
          <article
            key={`${item.employeeId}-${item.reasonType}`}
            className="rounded-xl border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold">
                    {item.employeeName}
                  </h2>

                  <span
                    className={[
                      "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                      PRIORITY_CLASS_NAMES[item.priority],
                    ].join(" ")}
                  >
                    Prioridade {item.priorityLabel.toLowerCase()}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">
                  {item.contextLabel}
                </p>

                <div>
                  <p className="font-medium">
                    {item.reason}
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.impact}
                  </p>

                  <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm">
                    {item.decisionSummary}
                  </p>

                  <div className="mt-4 space-y-2">
                    <p className="font-medium">
                      Próximas ações
                    </p>

                    {item.recommendedActions.map((action) => (
                      <Link
                        key={action.id}
                        href={action.href}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted"
                      >
                        <span>{action.label}</span>

                        <span className="text-muted-foreground">
                          {action.estimatedMinutes} min
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <div className="rounded-lg border px-4 py-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    Health Score
                  </p>

                  <p className="mt-1 font-semibold">
                    {item.healthScoreLabel}
                  </p>
                </div>

                <div className="rounded-lg border px-4 py-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    Decision Score
                  </p>

                  <p className="mt-1 font-semibold">
                    {item.decisionScore}
                  </p>
                </div>

                <Link
                  href={`/app/people/${item.employeeId}`}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Abrir colaborador
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      </div>
    </div>
  )
}

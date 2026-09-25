import Link from "next/link"

import type { AttentionPriority } from "../../types/attention-item"
import type { AttentionQueueViewModel } from "../../view-models/attention-queue-view-model"

type AttentionQueueProps = {
  viewModel: AttentionQueueViewModel
}

const PRIORITY_CLASS_NAMES: Record<AttentionPriority, string> = {
  high: "border-orange-200 bg-orange-50 text-orange-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-slate-200 bg-slate-50 text-slate-700",
}

export function AttentionQueue({ viewModel }: AttentionQueueProps) {
  if (viewModel.empty) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <h2 className="font-semibold">Nenhum item de atenção no momento</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Não há fatos dos fluxos de Avaliação, Feedback ou Desenvolvimento que
          gerem atenção agora.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Itens de atenção</p>
          <p className="mt-2 text-3xl font-bold">{viewModel.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Prioridade alta</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">
            {viewModel.high}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Prioridade média</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {viewModel.medium}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Prioridade baixa</p>
          <p className="mt-2 text-3xl font-bold text-slate-600">
            {viewModel.low}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {viewModel.items.map((item) => (
          <article key={item.id} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold">{item.subjectName}</h2>
                  <span
                    className={[
                      "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                      PRIORITY_CLASS_NAMES[item.priority],
                    ].join(" ")}
                  >
                    Prioridade {item.priorityLabel.toLowerCase()}
                  </span>
                </div>

                <p className="font-medium">{item.reasonLabel}</p>
                <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <div>
                    <dt className="inline font-medium text-foreground">Pessoa: </dt>
                    <dd className="inline">{item.subjectStatusLabel}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-foreground">Status: </dt>
                    <dd className="inline">{item.sourceStatusLabel}</dd>
                  </div>
                  {item.dueDateLabel ? (
                    <div>
                      <dt className="inline font-medium text-foreground">Prazo: </dt>
                      <dd className="inline">{item.dueDateLabel}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <Link
                href={item.actionHref}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {item.actionLabel}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

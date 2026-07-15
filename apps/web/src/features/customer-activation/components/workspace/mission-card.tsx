import Link from "next/link"

import type {
  CustomerActivationStepViewModel,
} from "../../view-models/customer-activation-view-model"

type MissionCardProps = {
  step: CustomerActivationStepViewModel
  position: number
  isCurrent: boolean
  action?: {
    label: string
    href: string
  } | null
}

export function MissionCard({
  step,
  position,
  isCurrent,
  action = null,
}: MissionCardProps) {
  const isCompleted = step.status === "completed"

  return (
    <article
      className={[
        "rounded-2xl border p-5 transition-colors sm:p-6",
        isCurrent
          ? "border-slate-950 bg-white shadow-md"
          : "border-slate-200 bg-white shadow-sm",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            isCompleted
              ? "bg-slate-950 text-white"
              : isCurrent
                ? "border-2 border-slate-950 bg-white text-slate-950"
                : "border border-slate-300 bg-slate-50 text-slate-500",
          ].join(" ")}
          aria-hidden="true"
        >
          {isCompleted ? "✓" : position}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {isCompleted
                  ? "Missão concluída"
                  : isCurrent
                    ? "Missão atual"
                    : "Próxima missão"}
              </p>

              <h2 className="text-lg font-semibold text-slate-950">
                {step.title}
              </h2>
            </div>

            <span
              className={[
                "w-fit rounded-full px-3 py-1 text-xs font-semibold",
                isCompleted
                  ? "bg-emerald-50 text-emerald-700"
                  : isCurrent
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600",
              ].join(" ")}
            >
              {isCompleted
                ? "Concluída"
                : isCurrent
                  ? "Em andamento"
                  : "Pendente"}
            </span>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            {step.description}
          </p>

          {isCurrent && action ? (
            <div className="mt-5">
              <Link
                href={action.href}
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                {action.label}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

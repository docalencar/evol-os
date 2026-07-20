import Link from "next/link"

type PrioritySeverity = "critical" | "high" | "medium"

export type PriorityItem = {
  id: string
  title: string
  description: string
  severity: PrioritySeverity
  href: string
}

type PriorityPanelProps = {
  priorities: PriorityItem[]
}

const severityStyles: Record<
  PrioritySeverity,
  {
    label: string
    dot: string
    badge: string
  }
> = {
  critical: {
    label: "Crítica",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700",
  },
  high: {
    label: "Alta",
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-700",
  },
  medium: {
    label: "Média",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700",
  },
}

export function PriorityPanel({ priorities }: PriorityPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Centro de Prioridades
        </p>

        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          O que precisa de atenção
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Itens demonstrativos até conectarmos os dados reais.
        </p>
      </div>

      <div className="mt-5 divide-y divide-slate-100">
        {priorities.map((priority) => {
          const styles = severityStyles[priority.severity]

          return (
            <article
              key={priority.id}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`}
                />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-slate-900">
                      {priority.title}
                    </h3>

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}
                    >
                      {styles.label}
                    </span>
                  </div>

                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    {priority.description}
                  </p>
                </div>
              </div>

              <Link
                href={priority.href}
                className="shrink-0 text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
              >
                Ver item
              </Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}

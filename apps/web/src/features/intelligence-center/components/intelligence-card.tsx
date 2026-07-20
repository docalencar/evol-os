import Link from "next/link"

export type IntelligenceCardTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"

type IntelligenceCardProps = {
  title: string
  value: string
  description: string
  trend?: string
  recommendation?: string
  href: string
  actionLabel?: string
  tone?: IntelligenceCardTone
}

const toneStyles: Record<
  IntelligenceCardTone,
  {
    indicator: string
    badge: string
  }
> = {
  neutral: {
    indicator: "bg-slate-400",
    badge: "bg-slate-100 text-slate-700",
  },
  success: {
    indicator: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
  },
  warning: {
    indicator: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700",
  },
  danger: {
    indicator: "bg-red-500",
    badge: "bg-red-50 text-red-700",
  },
}

export function IntelligenceCard({
  title,
  value,
  description,
  trend,
  recommendation,
  href,
  actionLabel = "Ver detalhes",
  tone = "neutral",
}: IntelligenceCardProps) {
  const styles = toneStyles[tone]

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full ${styles.indicator}`}
          />

          <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        </div>

        {trend ? (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles.badge}`}
          >
            {trend}
          </span>
        ) : null}
      </div>

      <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

      {recommendation ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recomendação
          </p>

          <p className="mt-1 text-sm leading-5 text-slate-700">
            {recommendation}
          </p>
        </div>
      ) : null}

      <div className="mt-auto pt-5">
        <Link
          href={href}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          {actionLabel}
        </Link>
      </div>
    </article>
  )
}

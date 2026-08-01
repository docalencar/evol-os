import Link from "next/link"

import type { DecisionFeedViewModel } from "../decision-feed"

type ExecutiveDecisionFeedProps = {
  feed: DecisionFeedViewModel
}

const priorityClasses = {
  critical: "border-red-200 bg-red-50 text-red-700",
  high: "border-amber-200 bg-amber-50 text-amber-700",
  medium: "border-blue-200 bg-blue-50 text-blue-700",
  low: "border-slate-200 bg-slate-50 text-slate-700",
} as const

export function ExecutiveDecisionFeed({
  feed,
}: ExecutiveDecisionFeedProps) {
  return (
    <section
      aria-labelledby="executive-decision-feed-title"
      className="rounded-xl border bg-card p-6"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="executive-decision-feed-title"
            className="text-lg font-semibold"
          >
            {feed.title}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {feed.description}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Atualizado em {feed.generatedAtLabel}
        </p>
      </div>

      {feed.isEmpty ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhuma decisão pendente no momento.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {feed.items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border bg-background p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${priorityClasses[item.priority]}`}
                    >
                      {item.priorityLabel}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      {item.sourceLabel}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      {item.categoryLabel}
                    </span>
                  </div>

                  <p className="mt-3 font-medium">
                    {item.title}
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>

                  {item.badges.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.badges.map((badge) => (
                        <span
                          key={badge.id}
                          className="rounded-full border px-2 py-1 text-xs text-muted-foreground"
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  <span className="text-xs text-muted-foreground">
                    {item.occurredAtLabel}
                  </span>

                  {item.href ? (
                    <Link
                      href={item.href}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      Ver contexto
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
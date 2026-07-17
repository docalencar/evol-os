import type { ReactNode } from "react"

export type ActivityTimelineCardProps = {
  title: string
  description?: string | null
  actorLabel?: string | null
  occurredAtLabel: string
  moduleLabel?: string | null
  activityTypeLabel?: string | null
  icon?: ReactNode
}

export function ActivityTimelineCard({
  title,
  description,
  actorLabel,
  occurredAtLabel,
  moduleLabel,
  activityTypeLabel,
  icon,
}: ActivityTimelineCardProps) {
  return (
    <article className="relative flex gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
        {icon ?? (
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full bg-current"
          />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <h3 className="text-sm font-semibold leading-5">
            {title}
          </h3>

          <time className="shrink-0 text-xs text-muted-foreground">
            {occurredAtLabel}
          </time>
        </div>

        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {actorLabel ? (
            <span>
              Por {actorLabel}
            </span>
          ) : null}

          {moduleLabel ? (
            <span className="rounded-full border px-2 py-0.5">
              {moduleLabel}
            </span>
          ) : null}

          {activityTypeLabel ? (
            <span className="rounded-full border px-2 py-0.5">
              {activityTypeLabel}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}

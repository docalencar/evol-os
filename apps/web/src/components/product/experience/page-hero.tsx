import type {
  ReactNode,
} from "react"

type PageHeroProps = {
  eyebrow?: string
  title: string
  description: string
  estimatedTime?: string
  badge?: ReactNode
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
  aside?: ReactNode
}

export function PageHero({
  eyebrow,
  title,
  description,
  estimatedTime,
  badge,
  primaryAction,
  secondaryAction,
  aside,
}: PageHeroProps) {
  const hasActions =
    primaryAction !== undefined ||
    secondaryAction !== undefined

  const hasMetadata =
    estimatedTime !== undefined ||
    badge !== undefined

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0 space-y-5">
          <div className="space-y-3">
            {eyebrow ? (
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                {eyebrow}
              </p>
            ) : null}

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {title}
              </h1>

              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                {description}
              </p>
            </div>
          </div>

          {hasMetadata ? (
            <div className="flex flex-wrap items-center gap-3">
              {estimatedTime ? (
                <span className="inline-flex items-center rounded-full border bg-background px-3 py-1.5 text-sm text-muted-foreground">
                  Tempo estimado: {estimatedTime}
                </span>
              ) : null}

              {badge}
            </div>
          ) : null}

          {hasActions ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {primaryAction}
              {secondaryAction}
            </div>
          ) : null}
        </div>

        {aside ? (
          <div className="w-full lg:w-80">
            {aside}
          </div>
        ) : null}
      </div>
    </section>
  )
}

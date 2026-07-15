import type { ReactNode } from "react"

type ProductHeroProps = {
  title: string
  description: string
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
  children?: ReactNode
}

export function ProductHero({
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: ProductHeroProps) {
  return (
    <section className="rounded-xl border bg-card p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {title}
          </h1>

          <p className="text-muted-foreground text-base leading-7">
            {description}
          </p>

          {children}
        </div>

        {(primaryAction || secondaryAction) && (
          <div className="flex flex-wrap gap-3">
            {secondaryAction}
            {primaryAction}
          </div>
        )}
      </div>
    </section>
  )
}

import type {
  ReactNode,
} from "react"

type NextStepCardProps = {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
  secondaryAction?: ReactNode
}

export function NextStepCard({
  eyebrow = "Próximo passo",
  title,
  description,
  action,
  secondaryAction,
}: NextStepCardProps) {
  const hasActions =
    action !== undefined ||
    secondaryAction !== undefined

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {eyebrow}
          </p>

          <h2 className="mt-1 text-xl font-semibold text-foreground">
            {title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>

        {hasActions ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {action}
            {secondaryAction}
          </div>
        ) : null}
      </div>
    </section>
  )
}

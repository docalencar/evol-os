import type {
  ReactNode,
} from "react"

type DashboardEmptyStateProps = {
  title: string

  description?: string

  icon?: ReactNode

  /**
   * Optional affordance for the action the empty state describes.
   *
   * An empty state that instructs without offering is a dead end: the Planning
   * scenarios list told people to create a scenario while rendering no control
   * to do it, because the only one lived inside an existing scenario's card.
   * Optional on purpose — the twenty-four existing callers are unaffected.
   */
  action?: ReactNode
}

export function DashboardEmptyState({
  title,
  description,
  icon,
  action,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 px-6 py-8 text-center">
      {icon ? (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          {icon}
        </div>
      ) : null}

      <p className="font-medium text-slate-900">
        {title}
      </p>

      {description ? (
        <p className="mt-1 max-w-md text-sm text-slate-500">
          {description}
        </p>
      ) : null}

      {action ? (
        <div className="mt-4">
          {action}
        </div>
      ) : null}
    </div>
  )
}
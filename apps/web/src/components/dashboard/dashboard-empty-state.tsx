import type {
  ReactNode,
} from "react"

type DashboardEmptyStateProps = {
  title: string

  description?: string

  icon?: ReactNode
}

export function DashboardEmptyState({
  title,
  description,
  icon,
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
    </div>
  )
}
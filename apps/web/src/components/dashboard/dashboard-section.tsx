import type {
  ReactNode,
} from "react"

type DashboardSectionProps = {
  title: string

  description?: string

  actions?: ReactNode

  children: ReactNode
}

export function DashboardSection({
  title,
  description,
  actions,
  children,
}: DashboardSectionProps) {
  return (
    <section className="flex h-full min-w-0 flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-900">
            {title}
          </h2>

          {description ? (
            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="shrink-0">
            {actions}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1">
        {children}
      </div>
    </section>
  )
}
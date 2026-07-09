import { ReactNode } from "react"

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
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          )}
        </div>

        {actions}
      </div>

      {children}
    </section>
  )
}

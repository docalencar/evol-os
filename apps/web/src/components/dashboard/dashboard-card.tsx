import { ReactNode } from "react"

import { Card } from "@/components/ui/card"

type DashboardCardProps = {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function DashboardCard({
  title,
  description,
  actions,
  children,
  className,
}: DashboardCardProps) {
  return (
    <Card className={className}>
      {(title || description || actions) && (
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
            )}

            {description && (
              <p className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>

          {actions}
        </div>
      )}

      {children}
    </Card>
  )
}

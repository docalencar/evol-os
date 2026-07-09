import { ReactNode } from "react"

import { DashboardCard } from "./dashboard-card"

type StatCardProps = {
  label: string
  value: ReactNode
  description?: string
  icon?: ReactNode
}

export function StatCard({
  label,
  value,
  description,
  icon,
}: StatCardProps) {
  return (
    <DashboardCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </div>

          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>

        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            {icon}
          </div>
        )}
      </div>
    </DashboardCard>
  )
}

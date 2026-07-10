import type { ReactNode } from "react"

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
    <DashboardCard className="min-w-0">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500">
            {label}
          </p>

          <div className="mt-2 min-w-0 break-words text-2xl font-bold leading-tight text-slate-900">
            {value}
          </div>

          {description ? (
            <p className="mt-2 text-sm text-slate-500">
              {description}
            </p>
          ) : null}
        </div>

        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            {icon}
          </div>
        ) : null}
      </div>
    </DashboardCard>
  )
}

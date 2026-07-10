import type { ReactNode } from "react"

import { DashboardCard } from "./dashboard-card"

type InfoCardProps = {
  label: string
  value: ReactNode
  icon?: ReactNode
}

export function InfoCard({ label, value, icon }: InfoCardProps) {
  return (
    <DashboardCard className="min-w-0">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500">{label}</p>

          <div className="mt-2 min-w-0 break-words font-semibold text-slate-900">
            {value}
          </div>
        </div>
      </div>
    </DashboardCard>
  )
}
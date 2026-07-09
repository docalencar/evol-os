import { ReactNode } from "react"

import { DashboardCard } from "./dashboard-card"

type InfoCardProps = {
  label: string
  value: ReactNode
  icon?: ReactNode
}

export function InfoCard({ label, value, icon }: InfoCardProps) {
  return (
    <DashboardCard>
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            {icon}
          </div>
        )}

        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <div className="mt-2 font-semibold text-slate-900">{value}</div>
        </div>
      </div>
    </DashboardCard>
  )
}

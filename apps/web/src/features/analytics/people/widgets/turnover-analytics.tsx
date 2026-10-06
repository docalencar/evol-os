import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { Badge } from "@/components/ui/badge"

import type { TurnoverAnalyticsViewModel } from "../types/turnover-analytics"

export function TurnoverAnalyticsWidget({
  turnover,
}: {
  turnover: TurnoverAnalyticsViewModel
}) {
  return (
    <section aria-labelledby="turnover-title">
      <div className="mb-4">
        <h2
          id="turnover-title"
          className="text-lg font-semibold text-slate-900"
        >
          Turnover total
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Agregado da empresa em UTC, sem detalhamento individual.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {turnover.periods.map((period) => (
          <DashboardCard key={period.kind}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-600">
                {period.label}
              </p>
              <Badge className="bg-slate-100 text-slate-700">
                {period.isAvailable ? "Disponível" : "Indisponível"}
              </Badge>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              {period.value}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {period.periodLabel}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {period.observationLabel}
            </p>
            {period.message ? (
              <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-700">
                {period.message}
              </p>
            ) : null}
          </DashboardCard>
        ))}
      </div>
    </section>
  )
}

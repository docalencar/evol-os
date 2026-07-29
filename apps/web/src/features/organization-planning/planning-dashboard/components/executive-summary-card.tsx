import { DashboardCard } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"

import type { PlanningDashboardViewModel } from "../../application"
import { PlanningDashboardIcon } from "./planning-dashboard-icon"
import { planningColorClasses } from "./planning-dashboard-styles"

type ExecutiveSummaryCardProps = {
  dashboard: PlanningDashboardViewModel
}

export function ExecutiveSummaryCard({ dashboard }: ExecutiveSummaryCardProps) {
  const { summary } = dashboard.insights

  return (
    <DashboardCard
      title="Resumo executivo"
      description={`Visão consolidada do cenário ${dashboard.scenario.name}.`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-3xl text-lg leading-8 text-slate-700">
          O cenário reúne {summary.totalChangesLabel}, com {summary.entitiesAffectedLabel} e {summary.risk.riskLabel.toLowerCase()}.
        </p>

        <Badge
          className={`shrink-0 gap-2 border ${planningColorClasses[summary.risk.color]}`}
        >
          <PlanningDashboardIcon icon={summary.risk.icon} className="size-4" />
          {summary.risk.riskLabel}
        </Badge>
      </div>
    </DashboardCard>
  )
}

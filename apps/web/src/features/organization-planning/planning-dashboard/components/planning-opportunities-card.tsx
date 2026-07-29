import { DashboardCard, DashboardEmptyState } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"

import type { PlanningOpportunityViewModel } from "../../presentation"
import { PlanningDashboardIcon } from "./planning-dashboard-icon"
import { planningColorClasses } from "./planning-dashboard-styles"

type PlanningOpportunitiesCardProps = {
  opportunities: readonly PlanningOpportunityViewModel[]
}

export function PlanningOpportunitiesCard({ opportunities }: PlanningOpportunitiesCardProps) {
  return (
    <DashboardCard title="Oportunidades" description="Possibilidades apresentadas pelas regras de Planning Insights.">
      {opportunities.length === 0 ? (
        <DashboardEmptyState title="Nenhuma oportunidade" description="Não há oportunidades destacadas para este cenário." />
      ) : (
        <ul className="space-y-3">
          {opportunities.map((opportunity) => (
            <li key={opportunity.id} className={`rounded-lg border p-4 ${planningColorClasses[opportunity.color]}`}>
              <div className="flex items-center gap-2">
                <PlanningDashboardIcon icon={opportunity.icon} className="size-4" />
                <h3 className="font-semibold">{opportunity.title}</h3>
                <Badge className="border border-current bg-white/60 text-inherit">{opportunity.category}</Badge>
              </div>
              <p className="mt-2 text-sm">{opportunity.description}</p>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}

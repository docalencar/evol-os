import { DashboardCard, DashboardEmptyState } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"

import type { PlanningWarningViewModel } from "../../presentation"
import { PlanningDashboardIcon } from "./planning-dashboard-icon"
import { planningColorClasses } from "./planning-dashboard-styles"

type PlanningRisksCardProps = {
  risks: readonly PlanningWarningViewModel[]
}

export function PlanningRisksCard({ risks }: PlanningRisksCardProps) {
  return (
    <DashboardCard title="Riscos" description="Alertas determinísticos identificados para o cenário.">
      {risks.length === 0 ? (
        <DashboardEmptyState title="Nenhum risco identificado" description="O cenário não produziu warnings nas regras atuais." />
      ) : (
        <ul className="space-y-3">
          {risks.map((risk) => (
            <li key={risk.id} className={`rounded-lg border p-4 ${planningColorClasses[risk.color]}`}>
              <div className="flex flex-wrap items-center gap-2">
                <PlanningDashboardIcon icon={risk.icon} className="size-4" />
                <h3 className="font-semibold">{risk.title}</h3>
                <Badge className="border border-current bg-white/60 text-inherit">{risk.badge}</Badge>
              </div>
              <p className="mt-2 text-sm">{risk.description}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide">{risk.category}</p>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}

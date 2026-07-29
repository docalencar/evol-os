import { DashboardCard } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"

import type { PlanningComparisonViewModel } from "../../presentation"
import { PlanningDashboardIcon } from "./planning-dashboard-icon"
import { planningColorClasses } from "./planning-dashboard-styles"

type PlanningImpactCardProps = {
  comparison: PlanningComparisonViewModel
}

const impactGroups = [
  { label: "Estrutura", metricId: "departments", sectionIds: ["departments", "teams", "positions"] },
  { label: "Pessoas", metricId: "headcount", sectionIds: ["employees"] },
  { label: "Vagas", metricId: "vacancies", sectionIds: ["vacancies"] },
] as const

export function PlanningImpactCard({ comparison }: PlanningImpactCardProps) {
  return (
    <DashboardCard
      title="Impacto organizacional"
      description="Leitura por dimensão, sem reinterpretação das regras do cenário."
    >
      <div className="grid gap-3 md:grid-cols-3">
        {impactGroups.map((group) => {
          const metric = comparison.metrics.find((item) => item.id === group.metricId)
          const sections = comparison.sections.filter((section) =>
            group.sectionIds.some((sectionId) => sectionId === section.id)
          )

          if (!metric) return null

          return (
            <div key={group.label} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-900">{group.label}</h3>
                <Badge className={`gap-1 border ${planningColorClasses[metric.color]}`}>
                  <PlanningDashboardIcon icon={metric.icon} className="size-3.5" />
                  {metric.deltaLabel}
                </Badge>
              </div>

              <ul className="mt-4 space-y-2 text-sm">
                {sections.map((section) => (
                  <li key={section.id} className="flex justify-between gap-3 text-slate-600">
                    <span>{section.label}</span>
                    <span className="font-medium text-slate-900">{section.totalLabel}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </DashboardCard>
  )
}

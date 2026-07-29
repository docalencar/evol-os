import { DashboardCard } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"

import type { PlanningComparisonSectionViewModel } from "../../presentation"

type PlanningStructuralChangesCardProps = {
  sections: readonly PlanningComparisonSectionViewModel[]
}

export function PlanningStructuralChangesCard({ sections }: PlanningStructuralChangesCardProps) {
  return (
    <DashboardCard title="Mudanças estruturais" description="Resumo das alterações por tipo de entidade.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {sections.map((section) => (
          <div key={section.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-slate-700">{section.label}</h3>
              <Badge>{section.total}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-500">{section.totalLabel}</p>
            {!section.isEmpty ? (
              <ul className="mt-3 space-y-1 text-xs text-slate-500">
                {section.changes.map((change) => (
                  <li key={change.id}>{change.changeLabel}: {change.entityLabel}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}

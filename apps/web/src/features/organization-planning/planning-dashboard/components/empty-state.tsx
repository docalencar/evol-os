import { GitCompareArrows } from "lucide-react"

import { DashboardEmptyState } from "@/components/dashboard"

export function PlanningDashboardEmptyState() {
  return (
    <DashboardEmptyState
      icon={<GitCompareArrows className="size-5" />}
      title="Nenhuma alteração neste cenário"
      description="A projeção e a organização de referência não apresentam diferenças."
    />
  )
}

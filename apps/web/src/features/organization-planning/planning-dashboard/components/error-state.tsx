"use client"

import { AlertTriangle } from "lucide-react"

import { DashboardEmptyState } from "@/components/dashboard"
import { Button } from "@/components/ui/button"

type PlanningDashboardErrorStateProps = {
  retry: () => void
}

export function PlanningDashboardErrorState({ retry }: PlanningDashboardErrorStateProps) {
  return (
    <div className="space-y-4">
      <DashboardEmptyState
        icon={<AlertTriangle className="size-5" />}
        title="Não foi possível carregar o cenário"
        description="Tente novamente. Se o problema persistir, revise os dados do cenário."
      />
      <div className="flex justify-center">
        <Button type="button" variant="outline" onClick={retry}>Tentar novamente</Button>
      </div>
    </div>
  )
}

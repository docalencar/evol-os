"use client"

import { AlertTriangle } from "lucide-react"

import { DashboardEmptyState } from "@/components/dashboard"
import { Button } from "@/components/ui/button"

type TimelineErrorStateProps = {
  retry: () => void
}

export function TimelineErrorState({ retry }: TimelineErrorStateProps) {
  return (
    <div className="space-y-4">
      <DashboardEmptyState
        icon={<AlertTriangle aria-hidden="true" className="size-5" />}
        title="Não foi possível carregar a Timeline"
        description="Tente novamente. Se o problema persistir, revise o workspace informado."
      />
      <div className="flex justify-center">
        <Button type="button" variant="outline" onClick={retry}>
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}

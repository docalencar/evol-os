import { GitBranch } from "lucide-react"

import { DashboardEmptyState } from "@/components/dashboard"

export function TimelineEmptyState() {
  return (
    <DashboardEmptyState
      icon={<GitBranch aria-hidden="true" className="size-5" />}
      title="Nenhum cenário na Timeline"
      description="Este workspace ainda não possui cenários para exibir."
    />
  )
}

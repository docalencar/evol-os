import { Layers3 } from "lucide-react"

import { DashboardEmptyState } from "@/components/dashboard"

import { ScenarioCard } from "./scenario-card"

type ScenarioListItem = {
  id: string
  name: string
  description?: string | null
  status: string
  version: number
  workspaceId: string
  baseSnapshotId: string
  updatedAt: Date
}

type ScenarioListProps = {
  scenarios: readonly ScenarioListItem[]
}

export function ScenarioList({
  scenarios,
}: ScenarioListProps) {
  if (scenarios.length === 0) {
    return (
      <DashboardEmptyState
        title="Nenhum cenário criado"
        description="Crie um cenário para simular alterações na estrutura organizacional sem modificar a versão publicada."
        icon={
          <Layers3
            className="h-5 w-5"
            aria-hidden="true"
          />
        }
      />
    )
  }

  return (
    <div className="grid gap-4">
      {scenarios.map((scenario) => (
        <ScenarioCard
          key={scenario.id}
          scenario={scenario}
        />
      ))}
    </div>
  )
}

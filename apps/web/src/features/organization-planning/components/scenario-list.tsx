import { Layers3 } from "lucide-react"

import { DashboardEmptyState } from "@/components/dashboard"

import { CreateScenarioDialog } from "./create-scenario-dialog"
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

/**
 * The workspace and the published snapshot a first scenario would branch from.
 *
 * Every `CreateScenarioDialog` elsewhere takes these from an EXISTING scenario,
 * which is why a workspace with zero scenarios had no way to create its first
 * one. The same identifiers are already on the page — the workspace's baseline
 * snapshot carries both — so the affordance needs no new query, action or RPC.
 *
 * Optional: absent it, the empty state keeps its previous instruction-only form.
 */
type ScenarioListBaseline = {
  workspaceId: string
  snapshotId: string
}

type ScenarioListProps = {
  scenarios: readonly ScenarioListItem[]
  baseline?: ScenarioListBaseline | null
}

export function ScenarioList({
  scenarios,
  baseline,
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
        action={
          baseline ? (
            <CreateScenarioDialog
              workspaceId={baseline.workspaceId}
              baseSnapshotId={baseline.snapshotId}
            />
          ) : null
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

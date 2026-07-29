import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

import { CreateScenarioDialog } from "./create-scenario-dialog"

type ScenarioCardData = {
  id: string
  name: string
  description?: string | null
  status: string
  version: number
  workspaceId: string
  baseSnapshotId: string
  updatedAt: Date
}

type ScenarioCardProps = {
  scenario: ScenarioCardData
  actions?: ReactNode
}

const dateFormatter = new Intl.DateTimeFormat(
  "pt-BR",
  {
    dateStyle: "medium",
  }
)

function getScenarioStatusLabel(
  status: string
) {
  switch (status) {
    case "draft":
      return "Rascunho"

    case "published":
      return "Publicado"

    case "archived":
      return "Arquivado"

    default:
      return status
  }
}

export function ScenarioCard({
  scenario,
  actions,
}: ScenarioCardProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-slate-900">
              {scenario.name}
            </h3>

            <Badge className="capitalize">
              {getScenarioStatusLabel(
                scenario.status
              )}
            </Badge>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {scenario.description ??
              "Nenhuma descrição informada para este cenário."}
          </p>
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <CreateScenarioDialog
              workspaceId={scenario.workspaceId}
              baseSnapshotId={scenario.baseSnapshotId}
            />
          </div>
        )}
      </div>

      <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Versão
          </dt>

          <dd className="mt-1 text-sm font-semibold text-slate-900">
            {scenario.version}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Snapshot-base
          </dt>

          <dd
            className="mt-1 truncate text-sm font-medium text-slate-700"
            title={scenario.baseSnapshotId}
          >
            {scenario.baseSnapshotId}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Atualizado em
          </dt>

          <dd className="mt-1 text-sm font-medium text-slate-700">
            {dateFormatter.format(
              scenario.updatedAt
            )}
          </dd>
        </div>
      </dl>
    </Card>
  )
}

import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

type WorkspaceCardProps = {
  title?: string
  currentSnapshotVersion?: number | null
  scenarioCount: number
  lastPublishedAt?: Date | null
  action?: ReactNode
}

const dateFormatter = new Intl.DateTimeFormat(
  "pt-BR",
  {
    dateStyle: "medium",
  }
)

export function WorkspaceCard({
  title = "Workspace de planejamento",
  currentSnapshotVersion,
  scenarioCount,
  lastPublishedAt,
  action,
}: WorkspaceCardProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900">
              {title}
            </h3>

            <Badge>
              {currentSnapshotVersion
                ? `Versão ${currentSnapshotVersion}`
                : "Sem versão publicada"}
            </Badge>
          </div>

          <p className="text-sm text-slate-500">
            Ambiente utilizado para organizar cenários,
            alterações e versões publicadas da estrutura
            organizacional.
          </p>
        </div>

        {action ? (
          <div className="shrink-0">
            {action}
          </div>
        ) : null}
      </div>

      <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Cenários
          </dt>

          <dd className="mt-1 text-sm font-semibold text-slate-900">
            {scenarioCount}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Última publicação
          </dt>

          <dd className="mt-1 text-sm font-semibold text-slate-900">
            {lastPublishedAt
              ? dateFormatter.format(lastPublishedAt)
              : "Ainda não publicada"}
          </dd>
        </div>
      </dl>
    </Card>
  )
}
import { CalendarDays, CircleDot, GitCommitHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import type { PlanningTimelineItemViewModel } from "../../timeline"
import { TimelineBadge } from "./timeline-badge"
import { TimelineConnector } from "./timeline-connector"
import { ScenarioOperationsMenu } from "./scenario-operations-menu"

type TimelineItemProps = {
  item: PlanningTimelineItemViewModel
  showConnector: boolean
}

const actions = ["Visualizar", "Comparar", "Publicar"] as const

export function TimelineItem({ item, showConnector }: TimelineItemProps) {
  return (
    <li className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-6">
      <div className="relative flex justify-center">
        <span className="relative z-10 flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm sm:size-12">
          {item.current ? (
            <CircleDot aria-hidden="true" className="size-5" />
          ) : (
            <GitCommitHorizontal aria-hidden="true" className="size-5" />
          )}
          <span className="sr-only">Nó do cenário {item.name}</span>
        </span>
        <TimelineConnector visible={showConnector} />
      </div>

      <Card className="min-w-0 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{item.name}</h2>
              <span className="text-sm font-medium text-slate-500">v{item.version}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
          </div>

          <div className="flex flex-wrap gap-2" aria-label={`Badges de ${item.name}`}>
            {item.badges.map((badge) => (
              <TimelineBadge key={badge.id} badge={badge} />
            ))}
          </div>
        </div>

        <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              <CalendarDays aria-hidden="true" className="size-3.5" /> Criado
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">{item.createdAtLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Atualizado</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">{item.updatedAtLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Baseline</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">{item.baselineVersionLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Publicado em</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">
              {item.publishedAtLabel ?? "Não publicado"}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5" aria-label={`Ações de ${item.name}`}>
          {actions.map((action) => (
            <Button key={action} type="button" variant="outline" size="sm" disabled>
              {action}
            </Button>
          ))}
          <ScenarioOperationsMenu item={item} />
        </div>
      </Card>
    </li>
  )
}

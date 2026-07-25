import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileStack,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"

import type {
  PlanningScenarioPage,
} from "../queries/get-planning-scenario"
import type {
  PlanningScenarioStatus,
} from "../types/planning-contracts"

type PlanningScenarioHeaderProps = {
  planning: PlanningScenarioPage
}

const STATUS_LABELS: Record<
  PlanningScenarioStatus,
  string
> = {
  draft: "Rascunho",
  submitted: "Em aprovação",
  approved: "Aprovado",
  rejected: "Rejeitado",
  published: "Publicado",
  archived: "Arquivado",
}

const STATUS_CLASSES: Record<
  PlanningScenarioStatus,
  string
> = {
  draft:
    "border-slate-200 bg-slate-50 text-slate-700",
  submitted:
    "border-amber-200 bg-amber-50 text-amber-700",
  approved:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected:
    "border-red-200 bg-red-50 text-red-700",
  published:
    "border-blue-200 bg-blue-50 text-blue-700",
  archived:
    "border-zinc-200 bg-zinc-100 text-zinc-600",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function ScenarioStatusBadge({
  status,
}: {
  status: PlanningScenarioStatus
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1",
        "text-xs font-medium",
        STATUS_CLASSES[status],
      ].join(" ")}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function ScenarioMetadata({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg border bg-muted/30 p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 text-sm font-medium">
          {value}
        </p>
      </div>
    </div>
  )
}

export function PlanningScenarioHeader({
  planning,
}: PlanningScenarioHeaderProps) {
  const {
    scenario,
    baseSnapshot,
  } = planning

  return (
    <div className="space-y-6">
      <PageHeader
        title={scenario.name}
        description={
          scenario.description ??
          "Este cenário ainda não possui uma descrição."
        }
      />

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <ScenarioStatusBadge
              status={scenario.status}
            />

            <span className="text-sm text-muted-foreground">
              Cenário v{scenario.version}
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <ScenarioMetadata
              icon={FileStack}
              label="Snapshot-base"
              value={`Snapshot v${baseSnapshot.version}`}
            />

            <ScenarioMetadata
              icon={CalendarClock}
              label="Criado em"
              value={formatDate(scenario.createdAt)}
            />

            <ScenarioMetadata
              icon={Clock3}
              label="Última alteração"
              value={formatDate(scenario.updatedAt)}
            />

            <ScenarioMetadata
              icon={CheckCircle2}
              label="Snapshot publicado"
              value={formatDate(baseSnapshot.publishedAt)}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

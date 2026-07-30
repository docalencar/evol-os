import { CalendarClock } from "lucide-react"

import { DashboardCard } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import type { ScenarioDTO } from "../../application"
import { PublicationWizard } from "../../publication-workflow"

type PublicationReadinessCardProps = {
  generatedAt: string
  version: number
  scenario: ScenarioDTO
}

const generatedAtFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function PublicationReadinessCard({ generatedAt, version, scenario }: PublicationReadinessCardProps) {
  return (
    <DashboardCard
      title="Prontidão para publicação"
      description="Valide a projeção e publique cenários aprovados."
      actions={<Badge>{scenario.status === "approved" ? "Pronto para validar" : "Aguardando aprovação"}</Badge>}
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Versão</dt>
          <dd className="mt-1 font-semibold text-slate-900">{version}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Gerado em</dt>
          <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-700">
            <CalendarClock className="size-4" />
            {generatedAtFormatter.format(new Date(generatedAt))}
          </dd>
        </div>
      </dl>

      <div className="mt-6"><PublicationWizard scenarioId={scenario.id} name={scenario.name} status={scenario.status} version={scenario.version} /></div>
    </DashboardCard>
  )
}

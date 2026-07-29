import { CalendarClock, LockKeyhole } from "lucide-react"

import { DashboardCard } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type PublicationReadinessCardProps = {
  generatedAt: string
  version: number
}

const generatedAtFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function PublicationReadinessCard({ generatedAt, version }: PublicationReadinessCardProps) {
  return (
    <DashboardCard
      title="Prontidão para publicação"
      description="A publicação será habilitada em uma evolução futura."
      actions={<Badge className="gap-1"><LockKeyhole className="size-3.5" /> Somente leitura</Badge>}
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

      <Button type="button" disabled className="mt-6 w-full sm:w-auto">
        Publicar Cenário
      </Button>
    </DashboardCard>
  )
}

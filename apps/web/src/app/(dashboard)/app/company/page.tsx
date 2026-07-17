

const ACTOR_LABELS = {
  user: "Usuário",
  system: "Sistema",
  automation: "Automação",
  integration: "Integração",
} satisfies Record<
  ActivityTimelineItemViewModel["actorType"],
  string
>

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date))
}

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function presentTimelineItem(
  item: ActivityTimelineItemViewModel
) {
  return {
    title: item.title,
    description: item.description,
    actorLabel: ACTOR_LABELS[item.actorType],
    occurredAtLabel: formatDate(item.occurredAt),
    moduleLabel: formatLabel(item.module),
    activityTypeLabel: formatLabel(item.activityType),
  }
}

import Link from "next/link"

import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DepartmentCreateDialog,
  DepartmentTable,
  getDepartments,
} from "@/features/organization/departments"

import {
  EntityTimelineSection,
  getCompanyTimeline,
  type ActivityTimelineItemViewModel,
} from "@/features/timeline"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function CompanyPage() {
  const { companyId } = await getCurrentCompanyContext()

  const [
    departments,
    companyTimeline,
  ] = await Promise.all([
    getDepartments(companyId),

    getCompanyTimeline({
      companyId,
      limit: 20,
    }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organização"
        description="Gerencie a estrutura organizacional da empresa."
        actions={<DepartmentCreateDialog companyId={companyId} />}
      />

      <DepartmentTable departments={departments ?? []} />


      <Card>
        <EntityTimelineSection
          title="Timeline da empresa"
          description="Últimas atividades registradas em toda a organização."
          emptyTitle="Nenhuma atividade registrada"
          emptyDescription="Quando houver movimentações, elas aparecerão aqui."
          items={companyTimeline.items.map(
            presentTimelineItem
          )}
        />
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Cargos</h3>

            <p className="mt-2 text-sm text-slate-600">
              Defina os cargos utilizados pelos colaboradores.
            </p>
          </div>

          <Link href="/app/company/positions">
            <Button variant="secondary">Gerenciar cargos</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
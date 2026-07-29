import Link from "next/link"

import {
  getOrganizationOverview,
  OrganizationOverviewHome,
  OrganizationStructure,
  getOrganizationStructure,
  presentOrganizationOverview,
} from "@/features/organization-intelligence"
import {
  listScenarios,
  listSnapshots,
} from "@/features/organization-planning"

import {
  DashboardEmptyState,
  DashboardSection,
} from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

const planningStages = [
  {
    label: "Cenários",
    description: "Organize alternativas a partir de uma base publicada.",
    available: true,
    href: "#planning-scenarios",
  },
  {
    label: "Alterações",
    description: "Estruture as mudanças organizacionais do cenário.",
    available: false,
    href: null,
  },
  {
    label: "Impactos",
    description: "Compare a projeção com a organização de referência.",
    available: false,
    href: null,
  },
  {
    label: "Validação",
    description: "Confira a consistência antes de submeter a decisão.",
    available: false,
    href: null,
  },
  {
    label: "Aprovação",
    description: "Acompanhe a decisão sobre o cenário proposto.",
    available: false,
    href: null,
  },
  {
    label: "Execução",
    description: "Publique as mudanças aprovadas na estrutura organizacional.",
    available: false,
    href: null,
  },
] as const

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
})

export default async function OrganizationPage() {
  const { companyId } =
    await getCurrentCompanyContext()

  const [overview, structure, scenarios, snapshots] = await Promise.all([
    getOrganizationOverview(companyId),
    getOrganizationStructure(companyId),
    listScenarios(companyId),
    listSnapshots(companyId),
  ])

  const viewModel =
    presentOrganizationOverview(overview)

  return (
    <div className="space-y-10">
      <OrganizationOverviewHome
        viewModel={viewModel}
      />

      <OrganizationStructure
        structure={structure}
      />

      <DashboardSection
        title="Planejamento organizacional"
        description="Navegue pelo ciclo de planejamento usando as capacidades disponíveis para esta empresa."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {planningStages.map((stage, index) => (
            <Card
              className="flex items-start gap-4 p-5"
              key={stage.label}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                {index + 1}
              </span>

              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">
                    {stage.label}
                  </h3>
                  <Badge>
                    {stage.available ? "Disponível" : "Em breve"}
                  </Badge>
                </div>

                <p className="text-sm text-slate-500">
                  {stage.description}
                </p>

                {stage.href ? (
                  <Link
                    className="inline-flex text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
                    href={stage.href}
                  >
                    Acessar etapa
                  </Link>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </DashboardSection>

      <div className="grid gap-8 xl:grid-cols-2">
        <div id="planning-scenarios">
          <DashboardSection
            title="Cenários"
            description="Alternativas de evolução organizacional já registradas."
          >
            {scenarios.length === 0 ? (
            <DashboardEmptyState
              title="Nenhum cenário encontrado"
              description="Ainda não existem cenários de planejamento para esta empresa."
            />
          ) : (
            <div className="space-y-3">
              {scenarios.map((scenario) => (
                <Card className="p-5" key={scenario.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900">
                        {scenario.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {scenario.description ?? "Sem descrição."}
                      </p>
                    </div>

                    <Badge className="shrink-0 capitalize">
                      {scenario.status}
                    </Badge>
                  </div>

                  <p className="mt-4 text-xs text-slate-400">
                    Atualizado em {dateFormatter.format(scenario.updatedAt)} · versão {scenario.version}
                  </p>
                </Card>
              ))}
            </div>
            )}
          </DashboardSection>
        </div>

        <div id="planning-snapshots">
          <DashboardSection
            title="Versões publicadas"
            description="Snapshots disponíveis como referência para novos cenários."
          >
            {snapshots.length === 0 ? (
            <DashboardEmptyState
              title="Nenhuma versão publicada"
              description="Ainda não existe um snapshot organizacional para esta empresa."
            />
          ) : (
            <div className="space-y-3">
              {snapshots.map((snapshot) => (
                <Card className="p-5" key={snapshot.id}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Versão {snapshot.version}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Publicada em {dateFormatter.format(snapshot.publishedAt)}
                      </p>
                    </div>

                    <Badge>
                      {snapshot.sourceScenarioId ? "Cenário publicado" : "Base inicial"}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
            )}
          </DashboardSection>
        </div>
      </div>
    </div>
  )
}

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
  ScenarioList,
  SnapshotList,
  WorkspaceCard,
} from "@/features/organization-planning/components"

import { DashboardSection } from "@/components/dashboard"
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

export default async function OrganizationPage() {
  const { companyId } =
    await getCurrentCompanyContext()

  const [
    overview,
    structure,
    scenarios,
    snapshots,
  ] = await Promise.all([
    getOrganizationOverview(companyId),
    getOrganizationStructure(companyId),
    listScenarios(companyId),
    listSnapshots(companyId),
  ])

  const viewModel =
    presentOrganizationOverview(overview)

  const latestSnapshot =
    snapshots.length > 0
      ? snapshots.reduce((latest, current) =>
          current.publishedAt > latest.publishedAt
            ? current
            : latest
        )
      : null

  const currentSnapshotVersion =
    snapshots.length > 0
      ? Math.max(
          ...snapshots.map(
            (snapshot) => snapshot.version
          )
        )
      : null

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
              key={stage.label}
              className="flex items-start gap-4 p-5"
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
                    {stage.available
                      ? "Disponível"
                      : "Em breve"}
                  </Badge>
                </div>

                <p className="text-sm text-slate-500">
                  {stage.description}
                </p>

                {stage.href ? (
                  <Link
                    href={stage.href}
                    className="inline-flex text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
                  >
                    Acessar etapa
                  </Link>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </DashboardSection>

      <WorkspaceCard
        scenarioCount={scenarios.length}
        currentSnapshotVersion={currentSnapshotVersion}
        lastPublishedAt={
          latestSnapshot?.publishedAt ?? null
        }
      />

      <div className="grid gap-8 xl:grid-cols-2">
        <div id="planning-scenarios">
          <DashboardSection
            title="Cenários"
            description="Alternativas de evolução organizacional já registradas."
          >
            <ScenarioList
              scenarios={scenarios}
            />
          </DashboardSection>
        </div>

        <div id="planning-snapshots">
          <DashboardSection
            title="Versões publicadas"
            description="Snapshots disponíveis como referência para novos cenários."
          >
            <SnapshotList
              snapshots={snapshots}
            />
          </DashboardSection>
        </div>
      </div>
    </div>
  )
}

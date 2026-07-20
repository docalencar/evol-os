import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { getDevelopmentExecutiveDashboard } from "@/features/development/services/get-development-executive-dashboard"
import { getOrganizationSummary } from "@/features/organization/dashboard/queries/get-organization-summary"
import { getPeopleSummary } from "@/features/people/dashboard/queries/get-people-summary"

import {
  IntelligenceCard,
  IntelligenceGrid,
  PriorityPanel,
  QuickActions,
} from "."

import type { PriorityItem } from "./priority-panel"
import type { QuickAction } from "./quick-actions"

const priorities: PriorityItem[] = [
  {
    id: "experience-deadlines",
    title: "Avaliações de experiência próximas do vencimento",
    description:
      "Há avaliações que precisam ser acompanhadas nos próximos dias.",
    severity: "critical",
    href: "/app/people",
  },
  {
    id: "development-plans",
    title: "Planos de desenvolvimento pendentes",
    description:
      "Revise os planos que ainda aguardam atualização dos responsáveis.",
    severity: "high",
    href: "/app/development",
  },
  {
    id: "organization-structure",
    title: "Estrutura organizacional incompleta",
    description:
      "Confira colaboradores sem vínculo completo de cargo ou liderança.",
    severity: "medium",
    href: "/app/organization",
  },
]

const quickActions: QuickAction[] = [
  {
    label: "Novo colaborador",
    description: "Cadastre uma nova pessoa na organização.",
    href: "/app/people/new",
  },
  {
    label: "Importar colaboradores",
    description: "Atualize o quadro por meio de uma planilha.",
    href: "/app/people/import",
  },
  {
    label: "Ver organização",
    description: "Consulte departamentos, cargos e estrutura.",
    href: "/app/organization",
  },
  {
    label: "Abrir indicadores",
    description: "Acompanhe os indicadores disponíveis.",
    href: "/app/indicators",
  },
]

export async function IntelligenceCenter() {
  const { companyId } = await getCurrentCompanyContext()

  const [people, development, organization] = await Promise.all([
    getPeopleSummary(companyId),
    getDevelopmentExecutiveDashboard(companyId),
    getOrganizationSummary(companyId),
  ])

  return (
    <main className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">
            Intelligence Center
          </h1>
        </header>

        <IntelligenceGrid>
          <IntelligenceCard
            title="Colaboradores"
            value={`${people.active} ativos`}
            description={`${people.total} colaboradores cadastrados`}
            trend={`${people.probation} em acompanhamento`}
            recommendation="Dados em tempo real."
            href="/app/people"
            tone="success"
          />

          <IntelligenceCard
            title="Experiência"
            value="Em desenvolvimento"
            description="A funcionalidade será integrada ao módulo de experiência."
            href="/app/people"
            tone="warning"
          />

          <IntelligenceCard
            title="Turnover"
            value="2,8%"
            description="Indicador demonstrativo."
            href="/app/indicators"
            tone="success"
          />

          <IntelligenceCard
            title="Desenvolvimento"
            value={`${development.kpis.activePlans} PDIs`}
            description={`${development.kpis.completedPlans} concluídos`}
            trend={`${development.kpis.averageProgress}% de progresso médio`}
            recommendation="Acompanhe os planos ativos."
            href="/app/development"
            tone="warning"
          />

          <IntelligenceCard
            title="Estrutura"
            value={`${organization.departments} departamentos`}
            description={`${organization.teams} times • ${organization.positions} cargos`}
            recommendation="Estrutura organizacional em tempo real."
            href="/app/organization"
            tone="success"
          />

          <IntelligenceCard
            title="Indicadores"
            value="Em evolução"
            description="Novos indicadores serão conectados."
            href="/app/indicators"
          />
        </IntelligenceGrid>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <PriorityPanel priorities={priorities} />
          <QuickActions actions={quickActions} />
        </div>
      </div>
    </main>
  )
}

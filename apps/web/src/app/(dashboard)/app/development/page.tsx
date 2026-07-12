import { PageHeader } from "@/components/shared/page-header"

import {
  CompanyCompetencyGapCard,
  DevelopmentDashboardKpiCards,
  DevelopmentMonthlyEvolutionCard,
  DevelopmentPlanDistributionCard,
  DevelopmentPlanTable,
  DevelopmentPrioritiesCard,
  getDevelopmentExecutiveDashboard,
} from "@/features/development"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

export default async function DevelopmentPage() {
  const { companyId } =
    await getCurrentCompanyContext()

  const dashboard =
    await getDevelopmentExecutiveDashboard(
      companyId
    )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planos de Desenvolvimento Individual"
        description="Acompanhe todos os PDIs da empresa."
      />

      <DevelopmentDashboardKpiCards
        kpis={dashboard.kpis}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <CompanyCompetencyGapCard
          competencies={
            dashboard.competencyGaps
          }
        />

        <DevelopmentPrioritiesCard
          priorities={
            dashboard.developmentPriorities
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DevelopmentPlanDistributionCard
          distribution={
            dashboard.planDistribution
          }
        />

        <DevelopmentMonthlyEvolutionCard
          evolution={
            dashboard.monthlyEvolution
          }
        />
      </div>

      <DevelopmentMonthlyEvolutionCard
        evolution={
          dashboard.monthlyEvolution
        }
      />

      <DevelopmentPlanTable
        plans={dashboard.planList.plans}
        owners={dashboard.planList.owners}
      />
    </div>
  )
}
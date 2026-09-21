import Link from "next/link"

import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"

import {
  DevelopmentCompetencyIntelligenceCard,
  DevelopmentDashboardKpiCards,
  DevelopmentMonthlyEvolutionCard,
  DevelopmentPlanDistributionCard,
  DevelopmentPlanTable,
  getDevelopmentExecutiveDashboard,
} from "@/features/development"

import { isAdministrativeRole } from "@/features/authorization"
import { getManagementPeople } from "@/features/dashboard-read"
import {
  ApplyDevelopmentTemplateDialog,
  getPublishedDevelopmentTemplateCatalog,
  getTemplateApplicationPresentation,
} from "@/features/development/templates"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

export default async function DevelopmentPage() {
  const { companyId, currentUser, personId } =
    await getCurrentCompanyContext()

  // Same administrative boundary, same decision-before-the-call as /app.
  const canReadCompetencyIntelligence =
    isAdministrativeRole(currentUser.role)

  const [dashboard, publishedTemplates, people] = await Promise.all([
    getDevelopmentExecutiveDashboard(
      companyId,
      canReadCompetencyIntelligence
    ),
    getPublishedDevelopmentTemplateCatalog(companyId),
    getManagementPeople(companyId),
  ])

  const applicationPresentation = getTemplateApplicationPresentation({
    people,
    actorPersonId: personId,
    actorRole: currentUser.role,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planos de Desenvolvimento Individual"
        description="Acompanhe os PDIs que você pode acessar."
        actions={
          <div className="flex flex-wrap gap-2">
            {applicationPresentation ? (
              <ApplyDevelopmentTemplateDialog
                templates={publishedTemplates}
                employees={applicationPresentation.targets}
                owners={applicationPresentation.owners}
                fixedOwnerId={applicationPresentation.fixedOwnerId}
              />
            ) : null}
            {isAdministrativeRole(currentUser.role) ? (
              <Button variant="secondary" nativeButton={false} render={<Link href="/app/development/templates" />}>
                Administrar templates
              </Button>
            ) : null}
          </div>
        }
      />

      <DevelopmentDashboardKpiCards
        kpis={dashboard.kpis}
      />

      <DevelopmentCompetencyIntelligenceCard
        intelligence={dashboard.competencyDevelopment}
      />

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
      />
    </div>
  )
}

import {
  DevelopmentPrioritiesCard,
  getDevelopmentExecutiveDashboard,
} from "@/features/development"
import { DashboardSection, StatCard } from "@/components/dashboard"
import {
  getOrganizationalRisks,
  getTalentOverview,
  getWorkforceHealth,
  getWorkforceInsights,
  OrganizationalRisks,
  presentOrganizationalRisks,
  presentWorkforceHealth,
  TalentOverview,
  WorkforceHealthHome,
  WorkforceInsights,
} from "@/features/hr-intelligence"
import { getOrganizationSummary } from "@/features/organization"
import {
  getJobOpeningFormOptions,
  getJobOpenings,
  JobOpeningTable,
} from "@/features/recruitment"
import {
  ActivityIntelligenceCard,
  getCompanyTimeline,
  presentActivityIntelligence,
} from "@/features/timeline"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function AppPage() {
  const { companyId } = await getCurrentCompanyContext()

  const [
    health,
    talentOverview,
    development,
    organization,
    jobOpenings,
    recruitmentOptions,
    companyTimeline,
  ] = await Promise.all([
    getWorkforceHealth(companyId),
    getTalentOverview(companyId),
    getDevelopmentExecutiveDashboard(companyId),
    getOrganizationSummary(companyId),
    getJobOpenings(companyId),
    getJobOpeningFormOptions(companyId),
    getCompanyTimeline({ companyId, limit: 20 }),
  ])

  const [risks, insights] = await Promise.all([
    getOrganizationalRisks(health),
    getWorkforceInsights(health),
  ])

  const activityIntelligence = presentActivityIntelligence({
    activities: companyTimeline.items,
  })

  return (
    <main className="space-y-10">
      <WorkforceHealthHome
        viewModel={presentWorkforceHealth(health)}
      />

      <WorkforceInsights insights={insights} />

      <TalentOverview overview={talentOverview} />

      <DashboardSection
        title="Estrutura organizacional"
        description="Visão consolidada da estrutura atual da empresa."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Departamentos"
            value={organization.departments}
          />
          <StatCard
            label="Times"
            value={organization.teams}
          />
          <StatCard
            label="Cargos"
            value={organization.positions}
          />
        </div>
      </DashboardSection>

      <DevelopmentPrioritiesCard
        priorities={development.developmentPriorities}
      />

      <OrganizationalRisks
        viewModel={presentOrganizationalRisks(risks)}
      />

      <ActivityIntelligenceCard
        intelligence={activityIntelligence}
      />

      <DashboardSection
        title="Recrutamento"
        description="Vagas e prioridades atuais de contratação."
      >
        <JobOpeningTable
          jobOpenings={jobOpenings}
          positions={recruitmentOptions.positions}
          departments={recruitmentOptions.departments}
          employees={recruitmentOptions.employees}
        />
      </DashboardSection>
    </main>
  )
}

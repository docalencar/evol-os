import { DashboardSection, StatCard } from "@/components/dashboard"
import { DashboardCompetencyDevelopmentCard } from "@/features/dashboard-read/components/dashboard-competency-development-card"
import {
  getOrganizationalRisks,
  getWorkforceInsights,
  OrganizationalRisks,
  presentOrganizationalRisks,
  presentWorkforceHealth,
  TalentOverview,
  WorkforceHealthHome,
  WorkforceInsights,
} from "@/features/hr-intelligence"
import {
  JobOpeningTable,
} from "@/features/recruitment"
import {
  ActivityIntelligenceCard,
  presentActivityIntelligence,
} from "@/features/timeline"
import { getAppDashboardReadModel } from "@/features/dashboard-read"
import { isAdministrativeRole } from "@/features/authorization"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function AppPage() {
  const { companyId, currentUser } = await getCurrentCompanyContext()

  // Company-wide competency intelligence is administrative (0124). Decided here,
  // from the session's own membership role, so a manager or an employee never
  // asks the boundary a question it is required to refuse — and never loses the
  // whole authenticated shell to that refusal.
  const canReadCompetencyIntelligence = isAdministrativeRole(currentUser.role)

  const {
    health,
    talentOverview,
    organization,
    competencyDevelopment,
    jobOpenings,
    recruitmentOptions,
    companyTimeline,
  } = await getAppDashboardReadModel(companyId, canReadCompetencyIntelligence)

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

      <DashboardCompetencyDevelopmentCard development={competencyDevelopment} />

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

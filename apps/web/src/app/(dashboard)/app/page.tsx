import {
  DevelopmentPrioritiesCard,
  getDevelopmentExecutiveDashboard,
} from "@/features/development"
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
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function AppPage() {
  const { companyId } = await getCurrentCompanyContext()

  const [health, talentOverview, development] = await Promise.all([
    getWorkforceHealth(companyId),
    getTalentOverview(companyId),
    getDevelopmentExecutiveDashboard(companyId),
  ])

  const [risks, insights] = await Promise.all([
    getOrganizationalRisks(health),
    getWorkforceInsights(health),
  ])

  return (
    <main className="space-y-10">
      <WorkforceHealthHome
        viewModel={presentWorkforceHealth(health)}
      />

      <WorkforceInsights insights={insights} />

      <TalentOverview overview={talentOverview} />

      <DevelopmentPrioritiesCard
        priorities={development.developmentPriorities}
      />

      <OrganizationalRisks
        viewModel={presentOrganizationalRisks(risks)}
      />
    </main>
  )
}

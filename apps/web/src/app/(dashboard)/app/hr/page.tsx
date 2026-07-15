import {
  getOrganizationalRisks,
  getWorkforceHealth,
  OrganizationalRisks,
  WorkforceInsights,
  TalentOverview,
  getWorkforceInsights,
  getTalentOverview,
  presentOrganizationalRisks,
  presentWorkforceHealth,
  WorkforceHealthHome,
} from "@/features/hr-intelligence"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function HRPage() {
  const { companyId } =
    await getCurrentCompanyContext()

  const health =
    await getWorkforceHealth(companyId)

  const risks =
    await getOrganizationalRisks(health)

  const insights =
    await getWorkforceInsights(health)

  const talentOverview =
    await getTalentOverview(companyId)

  const healthViewModel =
    presentWorkforceHealth(health)

  const risksViewModel =
    presentOrganizationalRisks(risks)

  return (
    <div className="space-y-10">
      <WorkforceHealthHome
        viewModel={healthViewModel}
      />

      <WorkforceInsights
        insights={insights}
      />

      <TalentOverview
        overview={talentOverview}
      />

      <OrganizationalRisks
        viewModel={risksViewModel}
      />
    </div>
  )
}

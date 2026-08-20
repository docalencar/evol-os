import { EntityBackLink } from "@/components/shared/entity-back-link"
import { PageHeader } from "@/components/shared/page-header"
import { getManagementTeams } from "@/features/dashboard-read"
import {
  TeamCreateDialog,
  TeamTable,
} from "@/features/organization/teams"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function TeamsPage() {
  const { companyId } = await getCurrentCompanyContext()

  const teams = await getManagementTeams(companyId)

  return (
    <div className="space-y-6">
      <EntityBackLink
        href="/app/company"
        label="Voltar para empresa"
      />

      <PageHeader
        title="Times"
        description="Organize os times da empresa."
        actions={<TeamCreateDialog companyId={companyId} />}
      />

      <TeamTable teams={teams ?? []} />
    </div>
  )
}

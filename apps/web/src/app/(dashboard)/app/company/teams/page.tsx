import { z } from "zod"

import { EntityBackLink } from "@/components/shared/entity-back-link"
import { PageHeader } from "@/components/shared/page-header"
import { getManagementTeams } from "@/features/dashboard-read"
import {
  TeamCreateDialog,
  TeamTable,
} from "@/features/organization/teams"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

type TeamsPageProps = {
  searchParams: Promise<{
    fromPersonId?: string
  }>
}

// Resolve the back destination. The only accepted origin context is a person id,
// re-validated as a UUID — so the back link can ONLY ever point at the internal
// /app/people/<id> route. Anything missing/invalid falls back to the Company
// hub. This cannot produce an open/arbitrary/external redirect.
function resolveBackLink(fromPersonId: string | undefined) {
  const personId = z
    .string()
    .uuid()
    .safeParse(fromPersonId)

  if (personId.success) {
    return {
      href: `/app/people/${personId.data}`,
      label: "Voltar para o perfil",
    }
  }

  return {
    href: "/app/company",
    label: "Voltar para empresa",
  }
}

export default async function TeamsPage({
  searchParams,
}: TeamsPageProps) {
  const { companyId } = await getCurrentCompanyContext()
  const { fromPersonId } = await searchParams

  const teams = await getManagementTeams(companyId)

  const backLink = resolveBackLink(fromPersonId)

  return (
    <div className="space-y-6">
      <EntityBackLink
        href={backLink.href}
        label={backLink.label}
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

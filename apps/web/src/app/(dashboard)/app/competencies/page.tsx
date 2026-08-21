import { EntityBackLink } from "@/components/shared/entity-back-link"
import { PageHeader } from "@/components/shared/page-header"
import {
  CompetencyCreateDialog,
  CompetencyTable,
} from "@/features/competencies"
import { getManagementCompetencies } from "@/features/dashboard-read"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { resolvePositionBackLink } from "./competency-return-context"

type CompetenciesPageProps = {
  searchParams: Promise<{
    fromPositionId?: string
  }>
}

export default async function CompetenciesPage({
  searchParams,
}: CompetenciesPageProps) {
  const { companyId } = await getCurrentCompanyContext()
  const { fromPositionId } = await searchParams

  const competencies = await getManagementCompetencies(companyId)
  const backLink = resolvePositionBackLink(fromPositionId)

  return (
    <div className="space-y-6">
      {backLink ? (
        <EntityBackLink href={backLink.href} label={backLink.label} />
      ) : null}

      <PageHeader
        title="Competências"
        description="Gerencie as competências técnicas, comportamentais e de liderança da empresa."
        actions={<CompetencyCreateDialog companyId={companyId} />}
      />

      <CompetencyTable
        companyId={companyId}
        competencies={competencies ?? []}
      />
    </div>
  )
}

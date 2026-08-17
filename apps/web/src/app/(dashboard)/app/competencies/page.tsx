import { PageHeader } from "@/components/shared/page-header"
import {
  CompetencyCreateDialog,
  CompetencyTable,
} from "@/features/competencies"
import { getManagementCompetencies } from "@/features/dashboard-read"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function CompetenciesPage() {
  const { companyId } = await getCurrentCompanyContext()

  const competencies = await getManagementCompetencies(companyId)

  return (
    <div className="space-y-6">
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

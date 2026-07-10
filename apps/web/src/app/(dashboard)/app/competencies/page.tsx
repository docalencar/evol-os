import { PageHeader } from "@/components/shared/page-header"
import {
  CompetencyCreateDialog,
  CompetencyTable,
  getCompetencies,
} from "@/features/competencies"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function CompetenciesPage() {
  const { companyId } = await getCurrentCompanyContext()

  const competencies = await getCompetencies(companyId)

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

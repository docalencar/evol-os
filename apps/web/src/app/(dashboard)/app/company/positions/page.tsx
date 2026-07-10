import { PageHeader } from "@/components/shared/page-header"
import { getPositionCompetencies } from "@/features/competencies/position-competencies"
import {
  getPositions,
  PositionCreateDialog,
  PositionTable,
} from "@/features/organization/positions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function PositionsPage() {
  const { companyId } = await getCurrentCompanyContext()

  const [positions, positionCompetencies] = await Promise.all([
    getPositions(companyId),
    getPositionCompetencies(companyId),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cargos"
        description="Organize os cargos da empresa."
        actions={<PositionCreateDialog companyId={companyId} />}
      />

      <PositionTable
        positions={positions ?? []}
        positionCompetencies={positionCompetencies ?? []}
      />
    </div>
  )
}

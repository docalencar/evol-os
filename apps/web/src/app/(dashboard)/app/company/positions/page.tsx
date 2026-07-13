import { PageHeader } from "@/components/shared/page-header"
import { getPositionCompetencies } from "@/features/competencies/position-competencies"
import { getDepartments } from "@/features/organization/departments"
import {
  getPositions,
  PositionCreateDialog,
  PositionTable,
} from "@/features/organization/positions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function PositionsPage() {
  const { companyId } = await getCurrentCompanyContext()

  const [positions, positionCompetencies, departments] = await Promise.all([
    getPositions(companyId),
    getPositionCompetencies(companyId),
    getDepartments(companyId),
  ])

  const departmentOptions = (departments ?? []).map((department) => ({
    id: department.id,
    name: department.name,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cargos"
        description="Organize os cargos da empresa."
        actions={
          <PositionCreateDialog
            companyId={companyId}
            departments={departmentOptions}
          />
        }
      />

      <PositionTable
        positions={positions ?? []}
        departments={departmentOptions}
        positionCompetencies={positionCompetencies ?? []}
      />
    </div>
  )
}
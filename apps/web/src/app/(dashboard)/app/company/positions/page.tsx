import { PageHeader } from "@/components/shared/page-header"
import {
  getManagementDepartments,
  getManagementPositionCompetencies,
  getManagementPositions,
} from "@/features/dashboard-read"
import {
  PositionCreateDialog,
  PositionTable,
} from "@/features/organization/positions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function PositionsPage() {
  const { companyId } = await getCurrentCompanyContext()

  const [positions, departments] = await Promise.all([
    getManagementPositions(companyId),
    getManagementDepartments(companyId),
  ])
  const positionCompetencies = (
    await Promise.all(
      positions.map((position) =>
        getManagementPositionCompetencies(
          companyId,
          position.id
        )
      )
    )
  ).flat()

  const departmentOptions = (departments ?? []).map(
    (department) => ({
      id: department.id,
      name: department.name,
    })
  )

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

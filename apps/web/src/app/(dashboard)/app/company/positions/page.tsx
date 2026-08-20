import { EntityBackLink } from "@/components/shared/entity-back-link"
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
import { getPositionSeniorities } from "@/features/organization/position-seniorities"
import { getSeniorityLevels } from "@/features/organization/seniority-levels"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function PositionsPage() {
  const { companyId } = await getCurrentCompanyContext()

  const [positions, departments, seniorityCatalog] = await Promise.all([
    getManagementPositions(companyId),
    getManagementDepartments(companyId),
    getSeniorityLevels(companyId),
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

  // Only ACTIVE catalog levels are offered as new selections.
  const seniorityLevels = (seniorityCatalog ?? [])
    .filter((level) => level.active)
    .map((level) => ({ id: level.id, label: level.label }))

  // Current active applicable seniorities per position (edit preselection).
  const applicableSeniorityLevelIdsByPosition = Object.fromEntries(
    await Promise.all(
      (positions ?? []).map(async (position) => {
        const { applicable } = await getPositionSeniorities(
          companyId,
          position.id
        )
        return [
          position.id,
          applicable.map((item) => item.seniorityLevelId),
        ] as const
      })
    )
  )

  const departmentOptions = (departments ?? []).map(
    (department) => ({
      id: department.id,
      name: department.name,
    })
  )

  return (
    <div className="space-y-6">
      <EntityBackLink
        href="/app/company"
        label="Voltar para empresa"
      />

      <PageHeader
        title="Cargos"
        description="Organize os cargos da empresa."
        actions={
          <PositionCreateDialog
            companyId={companyId}
            departments={departmentOptions}
            seniorityLevels={seniorityLevels}
          />
        }
      />

      <PositionTable
        positions={positions ?? []}
        departments={departmentOptions}
        positionCompetencies={positionCompetencies ?? []}
        seniorityLevels={seniorityLevels}
        applicableSeniorityLevelIdsByPosition={
          applicableSeniorityLevelIdsByPosition
        }
      />
    </div>
  )
}

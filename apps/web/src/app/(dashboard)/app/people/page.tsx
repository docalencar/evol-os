import { PageHeader } from "@/components/shared/page-header"
import { getPositions } from "@/features/organization/positions"
import { getTeams } from "@/features/organization/teams"
import {
  EmployeeCreateDialog,
  EmployeeTable,
  getEmployees,
} from "@/features/people"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function PeoplePage() {
  const { companyId } = await getCurrentCompanyContext()

  const [employees, teams, positions] = await Promise.all([
    getEmployees(companyId),
    getTeams(companyId),
    getPositions(companyId),
  ])

  const managerOptions = (employees ?? []).map((employee) => ({
    id: employee.id,
    name: employee.full_name,
  }))

  const managerNameById = new Map(
    managerOptions.map((manager) => [manager.id, manager.name])
  )

  const employeesWithManagerName = (employees ?? []).map((employee) => ({
    ...employee,
    manager_name: employee.manager_id
      ? managerNameById.get(employee.manager_id) ?? null
      : null,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pessoas"
        description="Organize colaboradores, cargos, departamentos e gestores."
        actions={
          <EmployeeCreateDialog
            companyId={companyId}
            teams={teams ?? []}
            positions={positions ?? []}
            managers={managerOptions}
          />
        }
      />

      <EmployeeTable
        employees={employeesWithManagerName}
        teams={teams ?? []}
        positions={positions ?? []}
        managers={managerOptions}
      />
    </div>
  )
}

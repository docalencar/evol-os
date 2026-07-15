import Link from "next/link"

import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { getPositions } from "@/features/organization/positions"
import { getTeams } from "@/features/organization/teams"
import {
  EmployeeCreateDialog,
  EmployeeTable,
  PeopleWorkspaceSummary,
  getEmployees,
  presentPeopleWorkspaceSummary,
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
    managerOptions.map((manager) => [
      manager.id,
      manager.name,
    ])
  )

  const employeesWithManagerName = (employees ?? []).map(
    (employee) => ({
      ...employee,
      manager_name: employee.manager_id
        ? managerNameById.get(employee.manager_id) ?? null
        : null,
    })
  )

  const summary = presentPeopleWorkspaceSummary(
    employees ?? []
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pessoas"
        description="Organize colaboradores, cargos, departamentos e gestores."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              render={
                <Link href="/app/people/import" />
              }
            >
              Sincronizar planilha
            </Button>

            <EmployeeCreateDialog
              companyId={companyId}
              teams={teams ?? []}
              positions={positions ?? []}
              managers={managerOptions}
            />
          </div>
        }
      />

      <PeopleWorkspaceSummary summary={summary} />

      <EmployeeTable
        employees={employeesWithManagerName}
        teams={teams ?? []}
        positions={positions ?? []}
        managers={managerOptions}
      />
    </div>
  )
}

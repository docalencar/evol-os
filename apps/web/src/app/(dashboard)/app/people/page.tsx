import Link from "next/link"

import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import {
  getManagementPeople,
  getManagementPositions,
  getManagementTeams,
} from "@/features/dashboard-read"
import {
  getInvitationRoleOptionsForActor,
  getPeopleAccessStates,
  presentPeopleAccessState,
} from "@/features/tenant-access"
import {
  EmployeeCreateDialog,
  EmployeeTable,
  PeopleWorkspaceSummary,
  presentPeopleWorkspaceSummary,
} from "@/features/people"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function PeoplePage() {
  const { companyId, currentUser, personId, supabase } =
    await getCurrentCompanyContext()
  const invitationRoleOptions =
    getInvitationRoleOptionsForActor(currentUser.role)

  const [employees, teams, positions, accessStateResult] =
    await Promise.all([
      getManagementPeople(companyId),
      getManagementTeams(companyId),
      getManagementPositions(companyId),
      getPeopleAccessStates(supabase, companyId),
    ])

  const accessStateByPersonId = new Map(
    accessStateResult.status === "available"
      ? accessStateResult.rows.map(
          (row) => [row.personId, row] as const
        )
      : []
  )

  const managerOptions = (employees ?? []).map(
    (employee) => ({
      id: employee.id,
      name: employee.full_name,
    })
  )

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
        ? (managerNameById.get(employee.manager_id) ?? null)
        : null,
      accessState: presentPeopleAccessState(
        accessStateByPersonId.get(employee.id) ?? null,
        currentUser.role,
        accessStateResult.status === "available",
        employee.id === personId
      ),
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
              nativeButton={false}
              render={<Link href="/app/people/import" />}
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
        invitationRoleOptions={invitationRoleOptions}
      />
    </div>
  )
}

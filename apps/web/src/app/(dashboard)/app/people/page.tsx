import { redirect } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { getPositions } from "@/features/organization/positions"
import { getTeams } from "@/features/organization/teams"
import {
  EmployeeCreateDialog,
  EmployeeTable,
  getEmployees,
} from "@/features/people"
import { createClient } from "@/lib/supabase/supabase/server"

export default async function PeoplePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: memberships } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)

  const companyId = memberships?.[0]?.company_id

  if (!companyId) {
    redirect("/onboarding")
  }

  const employees = await getEmployees(companyId)
  const teams = await getTeams(companyId)
  const positions = await getPositions(companyId)

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

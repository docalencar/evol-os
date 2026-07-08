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
          />
        }
      />

      <EmployeeTable
        employees={employees ?? []}
        teams={teams ?? []}
        positions={positions ?? []}
      />
    </div>
  )
}

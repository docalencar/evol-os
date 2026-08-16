import { PageHeader } from "@/components/shared/page-header"
import { getPositions } from "@/features/organization/positions"
import { getTeams } from "@/features/organization/teams"
import {
  EmployeeCreatePage,
  getEmployees,
} from "@/features/people"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function NewPersonPage() {
  const { companyId } = await getCurrentCompanyContext()
  const [employees, teams, positions] = await Promise.all([
    getEmployees(companyId),
    getTeams(companyId),
    getPositions(companyId),
  ])

  const managers = (employees ?? []).map((employee) => ({
    id: employee.id,
    name: employee.full_name,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adicionar pessoa"
        description="Comece pelos dados essenciais."
      />

      <EmployeeCreatePage
        companyId={companyId}
        teams={teams ?? []}
        positions={positions ?? []}
        managers={managers}
      />
    </div>
  )
}

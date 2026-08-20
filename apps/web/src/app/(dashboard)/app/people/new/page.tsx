import { PageHeader } from "@/components/shared/page-header"
import { getPeopleCreationOptions } from "@/features/dashboard-read"
import {
  EmployeeCreatePage,
  getPeopleSeniorityOptions,
} from "@/features/people"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function NewPersonPage() {
  const { companyId } = await getCurrentCompanyContext()
  const { managers, teams, positions } =
    await getPeopleCreationOptions(companyId)

  const seniorityOptionsByPosition = await getPeopleSeniorityOptions(
    companyId,
    positions.map((position) => position.id)
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adicionar pessoa"
        description="Comece pelos dados essenciais."
      />

      <EmployeeCreatePage
        companyId={companyId}
        teams={teams}
        positions={positions}
        managers={managers}
        seniorityOptionsByPosition={seniorityOptionsByPosition}
      />
    </div>
  )
}

import {
  notFound,
} from "next/navigation"

import {
  getOrganizationSyncExecutionDetails,
} from "@/features/organization/sync/server"
import {
  OrganizationSyncExecutionDetails,
} from "@/features/organization/sync"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

type OrganizationSyncExecutionDetailsPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function OrganizationSyncExecutionDetailsPage({
  params,
}: OrganizationSyncExecutionDetailsPageProps) {
  const { id } = await params

  const { companyId } =
    await getCurrentCompanyContext()

  const execution =
    await getOrganizationSyncExecutionDetails(
      companyId,
      id
    )

  if (!execution) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <OrganizationSyncExecutionDetails
        execution={execution}
      />
    </div>
  )
}

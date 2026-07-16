import {
  notFound,
} from "next/navigation"

import {
  OrganizationRollbackPreview,
  OrganizationSyncExecutionDetails,
} from "@/features/organization/sync"
import {
  getOrganizationRollbackPreview,
  getOrganizationSyncExecutionDetails,
} from "@/features/organization/sync/server"
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

  const [
    execution,
    rollback,
  ] = await Promise.all([
    getOrganizationSyncExecutionDetails(
      companyId,
      id
    ),
    getOrganizationRollbackPreview(
      companyId,
      id
    ),
  ])

  if (!execution || !rollback) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <OrganizationSyncExecutionDetails
        execution={execution}
      />

      <OrganizationRollbackPreview
        rollback={rollback}
      />
    </div>
  )
}

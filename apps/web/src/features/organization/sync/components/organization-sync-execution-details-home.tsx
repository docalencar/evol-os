import "server-only"

import {
  getOrganizationSyncExecutionDetails,
} from "../queries/get-organization-sync-execution-details"

import {
  OrganizationSyncExecutionDetails,
} from "./organization-sync-execution-details"

type OrganizationSyncExecutionDetailsHomeProps = {
  companyId: string
  executionId: string
}

export async function OrganizationSyncExecutionDetailsHome({
  companyId,
  executionId,
}: OrganizationSyncExecutionDetailsHomeProps) {
  const execution =
    await getOrganizationSyncExecutionDetails(
      companyId,
      executionId
    )

  if (!execution) {
    return null
  }

  return (
    <OrganizationSyncExecutionDetails
      execution={execution}
    />
  )
}

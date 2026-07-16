import "server-only"

import {
  createOrganizationTimelineRepository,
} from "../repositories/organization-timeline-repository"
import {
  presentOrganizationSyncExecutionDetails,
} from "../presenters/present-organization-sync-execution-details"
import type {
  OrganizationSyncExecutionTimelineRecord,
} from "../presenters/present-organization-sync-execution-details"
import type {
  OrganizationSyncExecutionDetailsViewModel,
} from "../view-models/organization-sync-execution-details-view-model"

export async function getOrganizationSyncExecutionDetails(
  companyId: string,
  executionId: string
): Promise<OrganizationSyncExecutionDetailsViewModel | null> {
  const repository =
    await createOrganizationTimelineRepository()

  const { data, error } =
    await repository.findById(
      companyId,
      executionId
    )

  if (error) {
    throw new Error(
      `Não foi possível carregar os detalhes da sincronização: ${error.message}`
    )
  }

  if (!data) {
    return null
  }

  return presentOrganizationSyncExecutionDetails(
    data as OrganizationSyncExecutionTimelineRecord
  )
}

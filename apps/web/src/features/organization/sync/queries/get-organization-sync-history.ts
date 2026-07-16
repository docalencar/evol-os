import "server-only"

import {
  createOrganizationTimelineRepository,
} from "../repositories/organization-timeline-repository"
import {
  presentOrganizationSyncHistory,
} from "../presenters/present-organization-sync-history"
import type {
  OrganizationSyncTimelineRecord,
} from "../presenters/present-organization-sync-history"
import type {
  OrganizationSyncHistoryViewModel,
} from "../view-models/organization-sync-history-view-model"

export async function getOrganizationSyncHistory(
  companyId: string
): Promise<OrganizationSyncHistoryViewModel> {
  const repository =
    await createOrganizationTimelineRepository()

  const { data, error } =
    await repository.listByCompany(companyId)

  if (error) {
    throw new Error(
      `Não foi possível carregar o histórico de sincronizações: ${error.message}`
    )
  }

  return presentOrganizationSyncHistory(
    (data ?? []) as OrganizationSyncTimelineRecord[]
  )
}

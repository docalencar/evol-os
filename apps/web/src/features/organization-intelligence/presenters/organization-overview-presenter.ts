import type { OrganizationOverview } from "../types/organization-overview"
import type { OrganizationOverviewViewModel } from "../view-models/organization-overview-view-model"

export function presentOrganizationOverview(
  overview: OrganizationOverview
): OrganizationOverviewViewModel {
  return {
    ...overview,
  }
}

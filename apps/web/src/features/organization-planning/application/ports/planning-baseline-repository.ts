import type { OrganizationPlanningWorkspace } from "../../domain/organization-planning-workspace"
import type { PublishedSnapshot } from "../../domain/published-snapshot"
import type { ProjectedOrganization } from "../../projection"

export type CreatePlanningBaselineInput = Readonly<{
  workspace: OrganizationPlanningWorkspace
  snapshot: PublishedSnapshot
  organization: ProjectedOrganization
}>

export interface PlanningBaselineRepository {
  existsBaselineByCompany(companyId: string): Promise<boolean>
  create(input: CreatePlanningBaselineInput): Promise<void>
}

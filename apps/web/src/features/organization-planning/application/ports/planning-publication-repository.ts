import type { PlanningScenario } from "../../domain/planning-scenario"
import type { PublishedSnapshot } from "../../domain/published-snapshot"
import type { ProjectedOrganization } from "../../projection"
import type { ChangeSet } from "../../types/planning-contracts"

export type PublishPlanningScenarioInput = Readonly<{
  companyId: string
  scenarioId: string
  expectedVersion: number
  snapshotId: string
  publishedAt: Date
  organization: ProjectedOrganization
  changeSets: readonly ChangeSet[]
}>

export type PlanningPublicationResult = Readonly<{
  scenario: PlanningScenario
  snapshot: PublishedSnapshot
  organization: ProjectedOrganization
}>

export interface PlanningPublicationRepository {
  publish(
    input: PublishPlanningScenarioInput
  ): Promise<PlanningPublicationResult>
}

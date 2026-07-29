import type { PlanningScenario } from "../../domain/planning-scenario"
import type { PublishedSnapshot } from "../../domain/published-snapshot"

export type PublishPlanningScenarioInput = Readonly<{
  companyId: string
  scenarioId: string
  expectedVersion: number
  snapshotId: string
  publishedAt: Date
}>

export type PlanningPublicationResult = Readonly<{
  scenario: PlanningScenario
  snapshot: PublishedSnapshot
}>

export interface PlanningPublicationRepository {
  publish(
    input: PublishPlanningScenarioInput
  ): Promise<PlanningPublicationResult>
}

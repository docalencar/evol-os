import type {
  PlanningPublicationRepository,
  PublishPlanningScenarioInput,
} from "../application"
import { parseProjectedOrganization } from "./projected-organization-record"
import {
  mapPlanningPublicationRow,
  type PlanningPublicationRow,
} from "./planning-publication-record"

export interface PlanningPublicationDatabase {
  rpc(
    name: string,
    parameters: Readonly<Record<string, unknown>>
  ): PromiseLike<Readonly<{
    data: unknown
    error: Readonly<{ message: string }> | null
  }>>
}

export function createPlanningPublicationRepositoryAdapter(
  database: PlanningPublicationDatabase
): PlanningPublicationRepository {
  return {
    async publish(input: PublishPlanningScenarioInput) {
      const organization = parseProjectedOrganization(
        input.organization
      )
      const { data, error } = await database.rpc(
        "publish_planning_scenario",
        {
          p_company_id: input.companyId,
          p_scenario_id: input.scenarioId,
          p_expected_version: input.expectedVersion,
          p_snapshot_id: input.snapshotId,
          p_published_at: input.publishedAt.toISOString(),
          p_organization: organization,
          p_change_sets: input.changeSets.map((changeSet) => ({
            id: changeSet.id,
            changeType: changeSet.changeType,
            payload: changeSet.payload,
            version: changeSet.version,
          })),
        }
      )

      if (error) throw new Error(error.message)

      const row = Array.isArray(data) ? data[0] : undefined

      if (!row) {
        throw new Error("PLANNING_PUBLICATION_RESULT_NOT_FOUND")
      }

      return mapPlanningPublicationRow(
        row as PlanningPublicationRow
      )
    },
  }
}

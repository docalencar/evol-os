import type {
  PlanningPublicationRepository,
  PublishPlanningScenarioInput,
} from "../application"
import { parseProjectedOrganization } from "./projected-organization-record"
import { mapScenario, type ScenarioRow } from "./scenario-record"
import { mapPublishedSnapshotRow, type SnapshotRow } from "./snapshot-record"

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
        "publish_planning_scenario_v1",
        {
          p_scenario_id: input.scenarioId,
          p_expected_version: input.expectedVersion,
          p_snapshot_id: input.snapshotId,
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

      const result = data as { snapshotId?: unknown }
      if (typeof result?.snapshotId !== "string") {
        throw new Error("PLANNING_PUBLICATION_RESULT_NOT_FOUND")
      }
      const [scenarios,snapshots]=await Promise.all([
        database.rpc("get_planning_scenarios_v1",{p_company_id:input.companyId}),
        database.rpc("get_planning_snapshots_v1",{p_company_id:input.companyId}),
      ])
      if(scenarios.error)throw new Error(scenarios.error.message)
      if(snapshots.error)throw new Error(snapshots.error.message)
      const scenario=(scenarios.data as ScenarioRow[]).find((row)=>row.id===input.scenarioId)
      const snapshot=(snapshots.data as SnapshotRow[]).find((row)=>row.id===result.snapshotId)
      if(!scenario||!snapshot)throw new Error("PLANNING_PUBLICATION_READBACK_NOT_FOUND")
      return Object.freeze({scenario:mapScenario(scenario),snapshot:mapPublishedSnapshotRow(snapshot),organization})
    },
  }
}

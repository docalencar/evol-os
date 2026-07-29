import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import type {
  PlanningPublicationRepository,
  PublishPlanningScenarioInput,
} from "../application"
import { PlanningScenario } from "../domain/planning-scenario"
import { PublishedSnapshot } from "../domain/published-snapshot"
import type { PlanningScenarioStatus } from "../types/planning-contracts"

type PlanningPublicationRow = {
  scenario_id: string
  scenario_company_id: string
  scenario_workspace_id: string
  scenario_base_snapshot_id: string
  scenario_name: string
  scenario_description: string | null
  scenario_status: PlanningScenarioStatus
  scenario_version: number
  scenario_created_at: string
  scenario_updated_at: string
  snapshot_id: string
  snapshot_company_id: string
  snapshot_workspace_id: string
  snapshot_source_scenario_id: string
  snapshot_version: number
  snapshot_published_at: string
}

function mapPublication(row: PlanningPublicationRow) {
  return Object.freeze({
    scenario: PlanningScenario.restorePublished({
      id: row.scenario_id,
      companyId: row.scenario_company_id,
      workspaceId: row.scenario_workspace_id,
      baseSnapshotId: row.scenario_base_snapshot_id,
      name: row.scenario_name,
      description: row.scenario_description,
      status: row.scenario_status,
      version: row.scenario_version,
      createdAt: new Date(row.scenario_created_at),
      updatedAt: new Date(row.scenario_updated_at),
    }),
    snapshot: PublishedSnapshot.restorePublished({
      id: row.snapshot_id,
      companyId: row.snapshot_company_id,
      workspaceId: row.snapshot_workspace_id,
      sourceScenarioId: row.snapshot_source_scenario_id,
      version: row.snapshot_version,
      publishedAt: new Date(row.snapshot_published_at),
    }),
  })
}

export async function createPlanningPublicationRepository(): Promise<PlanningPublicationRepository> {
  const database = await createServerDatabase()

  return {
    async publish(input: PublishPlanningScenarioInput) {
      const { data, error } = await database.rpc(
        "publish_planning_scenario",
        {
          p_company_id: input.companyId,
          p_scenario_id: input.scenarioId,
          p_expected_version: input.expectedVersion,
          p_snapshot_id: input.snapshotId,
          p_published_at: input.publishedAt.toISOString(),
        }
      )

      if (error) {
        throw new Error(error.message)
      }

      const row = (data as PlanningPublicationRow[] | null)?.[0]

      if (!row) {
        throw new Error("PLANNING_PUBLICATION_RESULT_NOT_FOUND")
      }

      return mapPublication(row)
    },
  }
}

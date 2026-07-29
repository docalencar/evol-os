import { z } from "zod"

import { PlanningScenario } from "../domain/planning-scenario"
import { PublishedSnapshot } from "../domain/published-snapshot"
import { PLANNING_SCENARIO_STATUSES } from "../types/planning-contracts"
import { parseProjectedOrganization } from "./projected-organization-record"

export type PlanningPublicationRow = Readonly<{
  scenario_id: unknown
  scenario_company_id: unknown
  scenario_workspace_id: unknown
  scenario_base_snapshot_id: unknown
  scenario_name: unknown
  scenario_description: unknown
  scenario_status: unknown
  scenario_version: unknown
  scenario_created_at: unknown
  scenario_updated_at: unknown
  snapshot_id: unknown
  snapshot_company_id: unknown
  snapshot_workspace_id: unknown
  snapshot_source_scenario_id: unknown
  snapshot_version: unknown
  snapshot_published_at: unknown
  snapshot_organization: unknown
}>

const id = z.string().min(1)
const timestamp = z.string().datetime({ offset: true })
const publicationRow = z.object({
  scenario_id: id,
  scenario_company_id: id,
  scenario_workspace_id: id,
  scenario_base_snapshot_id: id,
  scenario_name: z.string().min(1),
  scenario_description: z.string().nullable(),
  scenario_status: z.enum(PLANNING_SCENARIO_STATUSES),
  scenario_version: z.number().int().positive(),
  scenario_created_at: timestamp,
  scenario_updated_at: timestamp,
  snapshot_id: id,
  snapshot_company_id: id,
  snapshot_workspace_id: id,
  snapshot_source_scenario_id: id,
  snapshot_version: z.number().int().positive(),
  snapshot_published_at: timestamp,
  snapshot_organization: z.unknown(),
})

export function mapPlanningPublicationRow(
  row: PlanningPublicationRow
) {
  const parsed = publicationRow.safeParse(row)

  if (!parsed.success || parsed.data.snapshot_organization === null) {
    throw new Error("PLANNING_PUBLICATION_RESULT_INVALID_DATA", {
      cause: parsed.success ? undefined : parsed.error,
    })
  }

  const value = parsed.data
  const organization = parseProjectedOrganization(
    value.snapshot_organization
  )

  return Object.freeze({
    scenario: PlanningScenario.restorePublished({
      id: value.scenario_id,
      companyId: value.scenario_company_id,
      workspaceId: value.scenario_workspace_id,
      baseSnapshotId: value.scenario_base_snapshot_id,
      name: value.scenario_name,
      description: value.scenario_description,
      status: value.scenario_status,
      version: value.scenario_version,
      createdAt: new Date(value.scenario_created_at),
      updatedAt: new Date(value.scenario_updated_at),
    }),
    snapshot: PublishedSnapshot.restorePublished({
      id: value.snapshot_id,
      companyId: value.snapshot_company_id,
      workspaceId: value.snapshot_workspace_id,
      sourceScenarioId: value.snapshot_source_scenario_id,
      version: value.snapshot_version,
      publishedAt: new Date(value.snapshot_published_at),
      kind: "projection",
    }),
    organization,
  })
}

import { z } from "zod"

import { PublishedSnapshot } from "../domain/published-snapshot"
import type { ProjectionSnapshot } from "../projection"
import { parseProjectedOrganization } from "./projected-organization-record"

export type SnapshotRow = Readonly<{
  id: unknown
  company_id: unknown
  workspace_id: unknown
  source_scenario_id: unknown
  version: unknown
  published_at: unknown
  organization?: unknown
  kind?: unknown
}>

const snapshotRow = z.object({
  id: z.string().min(1),
  company_id: z.string().min(1),
  workspace_id: z.string().min(1),
  source_scenario_id: z.string().min(1).nullable(),
  version: z.number().int().positive(),
  published_at: z.string().datetime({ offset: true }),
  organization: z.unknown().optional(),
  kind: z.enum(["baseline", "projection"]).nullable().optional(),
})

export function mapPublishedSnapshotRow(row: SnapshotRow) {
  const value = parseSnapshotRow(row)

  if (value.organization !== null && value.organization !== undefined) {
    parseProjectedOrganization(value.organization)
  }

  return PublishedSnapshot.restore({
    id: value.id,
    companyId: value.company_id,
    workspaceId: value.workspace_id,
    sourceScenarioId: value.source_scenario_id,
    version: value.version,
    publishedAt: new Date(value.published_at),
    kind: value.kind ?? null,
  })
}

export function mapProjectionSnapshotRow(
  row: SnapshotRow
): ProjectionSnapshot {
  const value = parseSnapshotRow(row)
  const metadata = mapPublishedSnapshotRow(row).toContract()

  if (value.organization === null || value.organization === undefined) {
    return metadata
  }

  return Object.freeze({
    ...metadata,
    organization: parseProjectedOrganization(value.organization),
  })
}

function parseSnapshotRow(row: SnapshotRow) {
  const result = snapshotRow.safeParse(row)

  if (!result.success) {
    throw new Error("PLANNING_SNAPSHOT_INVALID_DATA", {
      cause: result.error,
    })
  }

  return result.data
}

import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import { PublishedSnapshot } from "../domain/published-snapshot"

type SnapshotRow = {
  id: string
  company_id: string
  workspace_id: string
  source_scenario_id: string | null
  version: number
  published_at: string
}

function mapSnapshot(row: SnapshotRow) {
  return PublishedSnapshot.restore({
    id: row.id,
    companyId: row.company_id,
    workspaceId: row.workspace_id,
    sourceScenarioId: row.source_scenario_id,
    version: row.version,
    publishedAt: new Date(row.published_at),
  })
}

export async function createSnapshotRepository() {
  const database = await createServerDatabase()
  const select = `
    id, company_id, workspace_id, source_scenario_id,
    version, published_at
  `

  return {
    async findAllByCompany(companyId: string) {
      const { data, error } = await database
        .from("organization_planning_snapshots")
        .select(select)
        .eq("company_id", companyId)
        .order("published_at", { ascending: false })

      return {
        data: error ? null : (data ?? []).map((row) => mapSnapshot(row as SnapshotRow)),
        error,
      }
    },

    async findById(companyId: string, snapshotId: string) {
      const { data, error } = await database
        .from("organization_planning_snapshots")
        .select(select)
        .eq("company_id", companyId)
        .eq("id", snapshotId)
        .maybeSingle()

      return {
        data: data ? mapSnapshot(data as SnapshotRow) : null,
        error,
      }
    },

    async create(snapshot: PublishedSnapshot) {
      const value = snapshot.toContract()
      return database
        .from("organization_planning_snapshots")
        .insert({
          id: value.id,
          company_id: value.companyId,
          workspace_id: value.workspaceId,
          source_scenario_id: value.sourceScenarioId,
          version: value.version,
          published_at: value.publishedAt.toISOString(),
        })
    },
  }
}

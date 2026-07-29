import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import type { PublishedSnapshot } from "../domain/published-snapshot"
import {
  mapProjectionSnapshotRow,
  mapPublishedSnapshotRow,
  type SnapshotRow,
} from "./snapshot-record"

export async function createSnapshotRepository() {
  const database = await createServerDatabase()
  const select = `
    id, company_id, workspace_id, source_scenario_id,
    version, published_at, organization, kind
  `

  return {
    async findAllByCompany(companyId: string) {
      const { data, error } = await database
        .from("organization_planning_snapshots")
        .select(select)
        .eq("company_id", companyId)
        .order("published_at", { ascending: false })

      if (error) throw new Error(error.message)
      return (data ?? []).map((row) =>
        mapPublishedSnapshotRow(row as SnapshotRow)
      )
    },

    async findById(companyId: string, snapshotId: string) {
      const { data, error } = await database
        .from("organization_planning_snapshots")
        .select(select)
        .eq("company_id", companyId)
        .eq("id", snapshotId)
        .maybeSingle()

      if (error) throw new Error(error.message)
      return data ? mapPublishedSnapshotRow(data as SnapshotRow) : null
    },

    async findProjectionById(companyId: string, snapshotId: string) {
      const { data, error } = await database
        .from("organization_planning_snapshots")
        .select(select)
        .eq("company_id", companyId)
        .eq("id", snapshotId)
        .maybeSingle()

      if (error) throw new Error(error.message)
      return data
        ? mapProjectionSnapshotRow(data as SnapshotRow)
        : null
    },

    async create(snapshot: PublishedSnapshot) {
      const value = snapshot.toContract()
      const { error } = await database
        .from("organization_planning_snapshots")
        .insert({
          id: value.id,
          company_id: value.companyId,
          workspace_id: value.workspaceId,
          source_scenario_id: value.sourceScenarioId,
          version: value.version,
          published_at: value.publishedAt.toISOString(),
          kind: value.kind,
        })

      if (error) throw new Error(error.message)
    },
  }
}

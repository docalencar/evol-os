import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import { PlanningScenario } from "../domain/planning-scenario"
import type { PlanningScenarioStatus } from "../types/planning-contracts"

type ScenarioRow = {
  id: string
  company_id: string
  workspace_id: string
  base_snapshot_id: string
  name: string
  description: string | null
  status: PlanningScenarioStatus
  version: number
  created_at: string
  updated_at: string
}

function mapScenario(row: ScenarioRow) {
  return PlanningScenario.restore({
    id: row.id,
    companyId: row.company_id,
    workspaceId: row.workspace_id,
    baseSnapshotId: row.base_snapshot_id,
    name: row.name,
    description: row.description,
    status: row.status,
    version: row.version,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  })
}

export async function createScenarioRepository() {
  const database = await createServerDatabase()
  const select = `
    id, company_id, workspace_id, base_snapshot_id,
    name, description, status, version, created_at, updated_at
  `

  return {
    async findAllByCompany(companyId: string) {
      const { data, error } = await database
        .from("organization_planning_scenarios")
        .select(select)
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false })

      return {
        data: error ? null : (data ?? []).map((row) => mapScenario(row as ScenarioRow)),
        error,
      }
    },

    async findById(companyId: string, scenarioId: string) {
      const { data, error } = await database
        .from("organization_planning_scenarios")
        .select(select)
        .eq("company_id", companyId)
        .eq("id", scenarioId)
        .maybeSingle()

      return {
        data: data ? mapScenario(data as ScenarioRow) : null,
        error,
      }
    },

    async create(scenario: PlanningScenario) {
      const value = scenario.toContract()
      return database
        .from("organization_planning_scenarios")
        .insert({
          id: value.id,
          company_id: value.companyId,
          workspace_id: value.workspaceId,
          base_snapshot_id: value.baseSnapshotId,
          name: value.name,
          description: value.description,
          status: value.status,
          version: value.version,
          created_at: value.createdAt.toISOString(),
          updated_at: value.updatedAt.toISOString(),
        })
    },

    async save(scenario: PlanningScenario, expectedVersion: number) {
      const value = scenario.toContract()
      return database
        .from("organization_planning_scenarios")
        .update({
          name: value.name,
          description: value.description,
          status: value.status,
          version: value.version,
          updated_at: value.updatedAt.toISOString(),
        })
        .eq("company_id", value.companyId)
        .eq("id", value.id)
        .eq("version", expectedVersion)
        .neq("status", "published")
        .select("id")
        .maybeSingle()
    },
  }
}

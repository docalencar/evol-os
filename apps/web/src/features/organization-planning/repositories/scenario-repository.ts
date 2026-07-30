import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import { PlanningScenario } from "../domain/planning-scenario"
import type { PlanningScenarioStatus } from "../types/planning-contracts"

type ScenarioRow = {
  id: string
  company_id: string
  workspace_id: string
  base_snapshot_id: string
  parent_scenario_id: string | null
  branch_depth: number
  branch_path: string
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
    parentScenarioId: row.parent_scenario_id,
    branchDepth: row.branch_depth,
    branchPath: row.branch_path,
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
    parent_scenario_id, branch_depth, branch_path,
    name, description, status, version, created_at, updated_at
  `

  return {
    async findAllByCompany(companyId: string) {
      const { data, error } = await database
        .from("organization_planning_scenarios")
        .select(select)
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false })

      if (error) throw new Error(error.message)
      return (data ?? []).map((row) =>
        mapScenario(row as ScenarioRow)
      )
    },

    async findById(companyId: string, scenarioId: string) {
      const { data, error } = await database
        .from("organization_planning_scenarios")
        .select(select)
        .eq("company_id", companyId)
        .eq("id", scenarioId)
        .maybeSingle()

      if (error) throw new Error(error.message)
      return data ? mapScenario(data as ScenarioRow) : null
    },

    async create(scenario: PlanningScenario) {
      await insertScenario(database, scenario)
    },

    async createBranch(scenario: PlanningScenario) {
      await insertScenario(database, scenario)
    },

    async save(scenario: PlanningScenario, expectedVersion: number) {
      const value = scenario.toContract()
      const { data, error } = await database
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

      if (error) throw new Error(error.message)
      if (!data) {
        throw new Error("PLANNING_VERSION_CONFLICT")
      }
    },

    async hasChildren(companyId: string, scenarioId: string) {
      const { count, error } = await database.from("organization_planning_scenarios")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId).eq("parent_scenario_id", scenarioId)
      if (error) throw new Error(error.message)
      return (count ?? 0) > 0
    },

    async hasPublishedSnapshot(companyId: string, scenarioId: string) {
      const { count, error } = await database.from("organization_planning_snapshots")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId).eq("source_scenario_id", scenarioId)
      if (error) throw new Error(error.message)
      return (count ?? 0) > 0
    },

    async deleteDraft(companyId: string, scenarioId: string, expectedVersion: number) {
      const { error } = await database.rpc("delete_planning_scenario", {
        p_company_id: companyId, p_scenario_id: scenarioId, p_expected_version: expectedVersion,
      })
      if (error) throw new Error(error.message)
    },
  }
}

type ScenarioDatabase = Awaited<ReturnType<typeof createServerDatabase>>

async function insertScenario(
  database: ScenarioDatabase,
  scenario: PlanningScenario
): Promise<void> {
  const value = scenario.toContract()
  const { error } = await database
    .from("organization_planning_scenarios")
    .insert({
      id: value.id,
      company_id: value.companyId,
      workspace_id: value.workspaceId,
      base_snapshot_id: value.baseSnapshotId,
      parent_scenario_id: value.parentScenarioId,
      branch_depth: value.branchDepth,
      branch_path: value.branchPath,
      name: value.name,
      description: value.description,
      status: value.status,
      version: value.version,
      created_at: value.createdAt.toISOString(),
      updated_at: value.updatedAt.toISOString(),
    })

  if (error) throw new Error(error.message)
}

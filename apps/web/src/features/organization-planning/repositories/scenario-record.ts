import { PlanningScenario } from "../domain/planning-scenario"
import type { PlanningScenarioStatus } from "../types/planning-contracts"

export type ScenarioRow = Readonly<{
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
}>

export function mapScenario(row: ScenarioRow): PlanningScenario {
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

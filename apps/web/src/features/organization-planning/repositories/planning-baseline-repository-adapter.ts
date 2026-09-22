import type {
  CreatePlanningBaselineInput,
  PlanningBaselineRepository,
} from "../application"
import { parseProjectedOrganization } from "./projected-organization-record"
import { OrganizationPlanningWorkspace } from "../domain/organization-planning-workspace"
import { mapPublishedSnapshotRow, type SnapshotRow } from "./snapshot-record"

type DatabaseResult = Readonly<{
  data: unknown
  error: Readonly<{ message: string }> | null
}>

export interface PlanningBaselineDatabase {
  rpc(
    name: string,
    parameters: Readonly<Record<string, unknown>>
  ): PromiseLike<DatabaseResult>
}

export function createPlanningBaselineRepositoryAdapter(
  database: PlanningBaselineDatabase
): PlanningBaselineRepository {
  return {
    async existsBaselineByCompany(companyId: string) {
      const { data, error } = await database.rpc("get_planning_snapshots_v1", { p_company_id: companyId })

      if (error) throw new Error(error.message)
      return Array.isArray(data) && data.some((row) => (row as { kind?: unknown }).kind === "baseline")
    },

    async create(input: CreatePlanningBaselineInput) {
      const workspace = input.workspace.toContract()
      const snapshot = input.snapshot.toContract()
      const organization = parseProjectedOrganization(input.organization)

      if (snapshot.kind !== "baseline") {
        throw new Error("PLANNING_BASELINE_SNAPSHOT_KIND_REQUIRED")
      }

      const { data, error } = await database.rpc(
        "bootstrap_planning_workspace_v1",
        {
          p_company_id: workspace.companyId,
          p_workspace_id: workspace.id,
          p_snapshot_id: snapshot.id,
          p_organization: organization,
        }
      )

      if (error) throw new Error(error.message)
      const result = data as { workspace?: Record<string, unknown>; snapshot?: SnapshotRow }
      if (!result.workspace || !result.snapshot) throw new Error("PLANNING_BASELINE_RESULT_INVALID_DATA")
      const row = result.workspace as { id:string;company_id:string;version:number;created_at:string;updated_at:string }
      return Object.freeze({
        workspace: OrganizationPlanningWorkspace.restore({ id:row.id,companyId:row.company_id,version:row.version,createdAt:new Date(row.created_at),updatedAt:new Date(row.updated_at) }),
        snapshot: mapPublishedSnapshotRow(result.snapshot),
      })
    },
  }
}

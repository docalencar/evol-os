import type {
  CreatePlanningBaselineInput,
  PlanningBaselineRepository,
} from "../application"
import { parseProjectedOrganization } from "./projected-organization-record"

type DatabaseResult = Readonly<{
  data: unknown
  error: Readonly<{ message: string }> | null
}>

interface BaselineQuery extends PromiseLike<DatabaseResult> {
  eq(column: string, value: string): BaselineQuery
  maybeSingle(): PromiseLike<DatabaseResult>
}

export interface PlanningBaselineDatabase {
  from(table: string): Readonly<{
    select(columns: string): BaselineQuery
  }>
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
      const { data, error } = await database
        .from("organization_planning_snapshots")
        .select("id")
        .eq("company_id", companyId)
        .eq("kind", "baseline")
        .maybeSingle()

      if (error) throw new Error(error.message)
      return data !== null
    },

    async create(input: CreatePlanningBaselineInput) {
      const workspace = input.workspace.toContract()
      const snapshot = input.snapshot.toContract()
      const organization = parseProjectedOrganization(input.organization)

      if (snapshot.kind !== "baseline") {
        throw new Error("PLANNING_BASELINE_SNAPSHOT_KIND_REQUIRED")
      }

      const { error } = await database.rpc(
        "bootstrap_planning_workspace",
        {
          p_company_id: workspace.companyId,
          p_workspace_id: workspace.id,
          p_snapshot_id: snapshot.id,
          p_created_at: workspace.createdAt.toISOString(),
          p_organization: organization,
        }
      )

      if (error) throw new Error(error.message)
    },
  }
}

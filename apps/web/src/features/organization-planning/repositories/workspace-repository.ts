import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import { OrganizationPlanningWorkspace } from "../domain/organization-planning-workspace"

type WorkspaceRow = {
  id: string
  company_id: string
  version: number
  created_at: string
  updated_at: string
}

function mapWorkspace(row: WorkspaceRow) {
  return OrganizationPlanningWorkspace.restore({
    id: row.id,
    companyId: row.company_id,
    version: row.version,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  })
}

export async function createWorkspaceRepository() {
  const database = await createServerDatabase()
  const select = "id, company_id, version, created_at, updated_at"

  return {
    async findAllByCompany(companyId: string) {
      const { data, error } = await database
        .from("organization_planning_workspaces")
        .select(select)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })

      return {
        data: error ? null : (data ?? []).map((row) => mapWorkspace(row as WorkspaceRow)),
        error,
      }
    },

    async create(workspace: OrganizationPlanningWorkspace) {
      const contract = workspace.toContract()
      return database
        .from("organization_planning_workspaces")
        .insert({
          id: contract.id,
          company_id: contract.companyId,
          version: contract.version,
          created_at: contract.createdAt.toISOString(),
          updated_at: contract.updatedAt.toISOString(),
        })
    },
  }
}

import { OrganizationPlanningWorkspace } from "../domain/organization-planning-workspace"
import { createWorkspaceSchema, type CreateWorkspaceInput } from "../schemas/planning-schemas"

export function createWorkspace(input: CreateWorkspaceInput) {
  return OrganizationPlanningWorkspace.create(
    createWorkspaceSchema.parse(input)
  )
}

import { OrganizationPlanningWorkspace } from "../domain/organization-planning-workspace"
import { PublishedSnapshot } from "../domain/published-snapshot"
import { createWorkspaceSchema, type CreateWorkspaceInput } from "../schemas/planning-schemas"

export function createWorkspace(input: CreateWorkspaceInput) {
  const validatedInput = createWorkspaceSchema.parse(input)
  const workspace = OrganizationPlanningWorkspace.create(
    validatedInput
  )
  const initialSnapshot = PublishedSnapshot.bootstrap({
    id: validatedInput.initialSnapshotId,
    companyId: validatedInput.companyId,
    workspaceId: validatedInput.id,
    version: validatedInput.allocatedInitialSnapshotVersion,
    publishedAt: validatedInput.createdAt,
  })

  return Object.freeze({ workspace, initialSnapshot })
}

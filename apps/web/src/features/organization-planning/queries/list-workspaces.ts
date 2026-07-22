import "server-only"

import { createWorkspaceRepository } from "../repositories/workspace-repository"
import { companyPlanningSchema } from "../schemas/planning-schemas"

export async function listWorkspaces(companyId: string) {
  const input = companyPlanningSchema.parse({ companyId })
  const repository = await createWorkspaceRepository()
  try {
    return await repository.findAllByCompany(input.companyId)
  } catch {
    throw new Error("Não foi possível carregar os workspaces de planejamento.")
  }
}

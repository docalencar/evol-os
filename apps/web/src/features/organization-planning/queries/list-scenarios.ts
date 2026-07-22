import "server-only"

import { createScenarioRepository } from "../repositories/scenario-repository"
import { companyPlanningSchema } from "../schemas/planning-schemas"

export async function listScenarios(companyId: string) {
  const input = companyPlanningSchema.parse({ companyId })
  const repository = await createScenarioRepository()
  const { data, error } = await repository.findAllByCompany(input.companyId)

  if (error) throw new Error("Não foi possível carregar os cenários.")
  return data ?? []
}

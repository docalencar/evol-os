import "server-only"

import { createScenarioRepository } from "../repositories/scenario-repository"
import { scenarioIdSchema } from "../schemas/planning-schemas"

export async function getScenario(companyId: string, scenarioId: string) {
  const input = scenarioIdSchema.parse({ companyId, scenarioId })
  const repository = await createScenarioRepository()
  const { data, error } = await repository.findById(input.companyId, input.scenarioId)

  if (error) throw new Error("Não foi possível carregar o cenário.")
  return data
}

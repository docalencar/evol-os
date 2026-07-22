import { PlanningScenario } from "../domain/planning-scenario"
import { createScenarioSchema, type CreateScenarioInput } from "../schemas/planning-schemas"

export function createScenario(input: CreateScenarioInput) {
  return PlanningScenario.create(createScenarioSchema.parse(input))
}

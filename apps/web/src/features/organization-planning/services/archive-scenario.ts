import type { PlanningScenario } from "../domain/planning-scenario"

export function archiveScenario(
  scenario: PlanningScenario,
  occurredAt: Date
) {
  return scenario.archive(occurredAt)
}

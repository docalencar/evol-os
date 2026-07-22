import type { PlanningScenario } from "../domain/planning-scenario"
import { PublishedSnapshot } from "../domain/published-snapshot"
import { assertPlanningDomain } from "../domain/planning-domain-error"
import { requireVersion } from "../domain/planning-domain-support"

type PublishScenarioInput = {
  snapshotId: string
  baseSnapshot: PublishedSnapshot
  allocatedSnapshotVersion: number
  occurredAt: Date
}

export function publishScenario(
  scenario: PlanningScenario,
  input: PublishScenarioInput
) {
  assertPlanningDomain(
    input.baseSnapshot.id === scenario.baseSnapshotId,
    "invalid_input",
    "O snapshot-base não corresponde ao cenário."
  )
  const allocatedSnapshotVersion = requireVersion(
    input.allocatedSnapshotVersion
  )
  assertPlanningDomain(
    allocatedSnapshotVersion > input.baseSnapshot.version,
    "invalid_input",
    "A versão alocada deve ser posterior à versão do snapshot-base."
  )
  assertPlanningDomain(
    input.baseSnapshot.companyId === scenario.companyId &&
      input.baseSnapshot.workspaceId === scenario.workspaceId,
    "invalid_input",
    "O snapshot-base deve pertencer à mesma empresa e workspace."
  )

  const publishedScenario = scenario.publish(input.occurredAt)
  const snapshot = PublishedSnapshot.publish({
    id: input.snapshotId,
    companyId: publishedScenario.companyId,
    workspaceId: publishedScenario.workspaceId,
    sourceScenarioId: publishedScenario.id,
    version: allocatedSnapshotVersion,
    publishedAt: input.occurredAt,
  })

  return Object.freeze({
    scenario: publishedScenario,
    snapshot,
  })
}

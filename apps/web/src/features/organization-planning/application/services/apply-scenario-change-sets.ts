import "server-only"

import {
  createPlanningChangeSetRepository,
} from "@/features/organization-planning/change-sets/repositories"
import {
  toProjectionChangeSets,
} from "@/features/organization-planning/change-sets/adapters"
import {
  ProjectionEngine,
  type ProjectedOrganization,
  type ProjectionIssue,
  type ProjectionMetrics,
} from "@/features/organization-planning/projection"
import {
  createScenarioRepository,
} from "@/features/organization-planning/repositories/scenario-repository"
import {
  createSnapshotRepository,
} from "@/features/organization-planning/repositories/snapshot-repository"

type ApplyScenarioChangeSetsInput = Readonly<{
  companyId: string
  scenarioId: string
}>

export type ApplyScenarioChangeSetsResult = Readonly<{
  applied: number
  isValid: boolean
  organization: ProjectedOrganization
  metrics: ProjectionMetrics
  warnings: readonly ProjectionIssue[]
  errors: readonly ProjectionIssue[]
}>

export async function applyScenarioChangeSets(
  input: ApplyScenarioChangeSetsInput
): Promise<ApplyScenarioChangeSetsResult> {
  const [
    scenarioRepository,
    snapshotRepository,
    changeSetRepository,
  ] = await Promise.all([
    createScenarioRepository(),
    createSnapshotRepository(),
    createPlanningChangeSetRepository(),
  ])

  const scenario =
    await scenarioRepository.findById(
      input.companyId,
      input.scenarioId
    )

  if (!scenario) {
    throw new Error(
      "Cenário de planejamento não encontrado."
    )
  }

  if (scenario.status !== "approved") {
    throw new Error(
      "Somente cenários aprovados podem ser aplicados."
    )
  }

  const [
    storedBaseSnapshot,
    planningChangeSets,
  ] = await Promise.all([
    snapshotRepository.findStoredById(
      input.companyId,
      scenario.baseSnapshotId
    ),
    changeSetRepository.findByScenario(
      input.companyId,
      input.scenarioId
    ),
  ])

  if (!storedBaseSnapshot) {
    throw new Error(
      "Snapshot-base do cenário não encontrado."
    )
  }

  if (
    storedBaseSnapshot.snapshot.workspaceId !==
    scenario.workspaceId
  ) {
    throw new Error(
      "O snapshot-base não pertence ao workspace do cenário."
    )
  }

  const changeSets =
    toProjectionChangeSets(
      planningChangeSets
    )

  const projection =
    ProjectionEngine.create().project({
      snapshot:
        storedBaseSnapshot.snapshot.toContract(),
      organizationSnapshot:
        storedBaseSnapshot.organization,
      scenario: scenario.toContract(),
      changeSets,
    })

  return Object.freeze({
    applied: changeSets.length,
    isValid: projection.isValid,
    organization: projection.organization,
    metrics: projection.metrics,
    warnings: projection.warnings,
    errors: projection.errors,
  })
}
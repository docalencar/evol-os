import type { PlanningUnitOfWork } from "../transactions"

export class PlanningApplicationError extends Error {
  constructor(
    readonly code:
      | "not_found"
      | "version_conflict"
      | "invalid_relation",
    message: string
  ) {
    super(message)
    this.name = "PlanningApplicationError"
  }
}

export type PlanningScenarioProjectionFailure = Readonly<{
  code: string
  message: string
  changeSetId?: string
}>

export class PlanningScenarioProjectionError extends Error {
  readonly code = "PLANNING_SCENARIO_PROJECTION_FAILED"
  readonly failures: readonly PlanningScenarioProjectionFailure[]

  constructor(
    failures: readonly PlanningScenarioProjectionFailure[],
    message = "Não foi possível projetar o cenário para publicação."
  ) {
    super(message)
    this.name = "PlanningScenarioProjectionError"
    this.failures = Object.freeze(
      failures.map((failure) => Object.freeze({ ...failure }))
    )
  }
}

export function findUnexecutedChangeSetFailures(
  changeSets: readonly { id: string }[],
  executedChangeSets: readonly { id: string }[]
): readonly PlanningScenarioProjectionFailure[] {
  const executedIds = new Set(
    executedChangeSets.map((changeSet) => changeSet.id)
  )

  return Object.freeze(
    changeSets
      .filter((changeSet) => !executedIds.has(changeSet.id))
      .map((changeSet) => Object.freeze({
        code: "planning.change_set.not_executed",
        message: `O change set ${changeSet.id} não foi executado.`,
        changeSetId: changeSet.id,
      }))
  )
}

export function requireApplicationEntity<T>(
  entity: T | null,
  message: string
): T {
  if (!entity) {
    throw new PlanningApplicationError("not_found", message)
  }
  return entity
}

export function assertExpectedVersion(
  expectedVersion: number,
  currentVersion: number
) {
  if (expectedVersion !== currentVersion) {
    throw new PlanningApplicationError(
      "version_conflict",
      "A entidade foi alterada por outra operação."
    )
  }
}

export function assertApplicationRelation(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new PlanningApplicationError(
      "invalid_relation",
      message
    )
  }
}

export async function executeInUnitOfWork<T>(
  unitOfWork: PlanningUnitOfWork,
  operation: () => Promise<T>
) {
  await unitOfWork.begin()

  try {
    const result = await operation()
    await unitOfWork.commit()
    return result
  } catch (error) {
    await unitOfWork.rollback()
    throw error
  }
}

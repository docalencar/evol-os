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

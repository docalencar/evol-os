import type { ChangeSet } from "../../types/planning-contracts"
import type { ProjectionContext } from "../context"

export interface ChangeSetExecutor {
  readonly name: string
  canExecute(changeSet: ChangeSet): boolean
  execute(context: ProjectionContext, changeSet: ChangeSet): ProjectionContext
}

export function matchesChangeType(changeSet: ChangeSet, prefix: string) {
  return changeSet.changeType.startsWith(`${prefix}.`)
}

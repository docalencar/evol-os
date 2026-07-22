import type { ChangeSet } from "../../types/planning-contracts"
import type { ProjectionContext } from "../context"
import type { ChangeSetExecutor } from "../executors"

export class ProjectionPipeline {
  constructor(private readonly executors: readonly ChangeSetExecutor[]) {}

  execute(context: ProjectionContext) {
    return context.changeSets.reduce(
      (current, changeSet) => this.executeChangeSet(current, changeSet),
      context
    )
  }

  private executeChangeSet(context: ProjectionContext, changeSet: ChangeSet) {
    const executor = this.executors.find((candidate) => candidate.canExecute(changeSet))

    if (!executor) {
      return context
        .addEvent(Object.freeze({ type: "change-set.unhandled", changeSetId: changeSet.id }))
        .addWarning(Object.freeze({
          code: "unhandled_change_set",
          message: `Nenhum executor atende ao change set ${changeSet.id}.`,
          changeSetId: changeSet.id,
        }))
    }

    return executor.execute(context, changeSet).addEvent(Object.freeze({
      type: "change-set.executed",
      changeSetId: changeSet.id,
      executor: executor.name,
    }))
  }
}

import type {
  ChangeSet,
} from "../../types/planning-contracts"
import type {
  PlanningChangeSet,
} from "../types/planning-change-set"

export function toProjectionChangeSet(
  changeSet: PlanningChangeSet
): ChangeSet {
  return Object.freeze({
    id: changeSet.id,
    companyId: changeSet.companyId,
    scenarioId: changeSet.scenarioId,
    changeType: changeSet.changeType,
    payload: Object.freeze({
      ...changeSet.payload,
    }),
    version: changeSet.version,
  })
}

export function toProjectionChangeSets(
  changeSets: readonly PlanningChangeSet[]
): readonly ChangeSet[] {
  return Object.freeze(
    changeSets.map(toProjectionChangeSet)
  )
}

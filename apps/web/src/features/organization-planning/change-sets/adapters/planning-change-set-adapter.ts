import type {
  ChangeSet,
} from "../../types/planning-contracts"
import type {
  PlanningChangeSet,
} from "../types/planning-change-set"
import {
  toProjectionChangeSet,
  toProjectionChangeSets,
} from "./to-projection-change-set"

export class PlanningChangeSetAdapter {
  static toProjection(
    changeSet: PlanningChangeSet
  ): ChangeSet {
    return toProjectionChangeSet(changeSet)
  }

  static toProjectionList(
    changeSets: readonly PlanningChangeSet[]
  ): readonly ChangeSet[] {
    return toProjectionChangeSets(changeSets)
  }
}

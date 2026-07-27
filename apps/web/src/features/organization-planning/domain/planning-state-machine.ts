import type {
  PlanningScenarioStatus,
} from "../types/planning-contracts"
import {
  assertPlanningDomain,
} from "./planning-domain-error"

const PLANNING_SCENARIO_TRANSITIONS = {
  draft: [
    "submitted",
    "archived",
  ],
  submitted: [
    "approved",
    "rejected",
    "archived",
  ],
  approved: [
    "published",
    "archived",
  ],
  rejected: [
    "archived",
  ],
  published: [],
  archived: [],
} as const satisfies Readonly<
  Record<
    PlanningScenarioStatus,
    readonly PlanningScenarioStatus[]
  >
>

const EDITABLE_PLANNING_SCENARIO_STATUSES = [
  "draft",
] as const satisfies readonly PlanningScenarioStatus[]

export class PlanningStateMachine {
  static canTransition(
    currentStatus: PlanningScenarioStatus,
    nextStatus: PlanningScenarioStatus
  ) {
    const allowedStatuses =
      PLANNING_SCENARIO_TRANSITIONS[
        currentStatus
      ] as readonly PlanningScenarioStatus[]

    return allowedStatuses.includes(
      nextStatus
    )
  }

  static assertTransition(
    currentStatus: PlanningScenarioStatus,
    nextStatus: PlanningScenarioStatus
  ) {
    assertPlanningDomain(
      this.canTransition(
        currentStatus,
        nextStatus
      ),
      "invalid_transition",
      `Transição de ${currentStatus} para ${nextStatus} não permitida.`
    )
  }

  static isEditable(
    status: PlanningScenarioStatus
  ) {
    return (
      EDITABLE_PLANNING_SCENARIO_STATUSES as
        readonly PlanningScenarioStatus[]
    ).includes(status)
  }

  static assertEditable(
    status: PlanningScenarioStatus
  ) {
    assertPlanningDomain(
      this.isEditable(status),
      "immutable_entity",
      "Apenas cenários em rascunho podem ser editados."
    )
  }

  static assertArchivable(
    status: PlanningScenarioStatus
  ) {
    assertPlanningDomain(
      status !== "published",
      "immutable_entity",
      "Cenários publicados não podem ser arquivados."
    )

    this.assertTransition(
      status,
      "archived"
    )
  }
}

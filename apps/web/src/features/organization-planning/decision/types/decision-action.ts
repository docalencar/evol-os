export const DECISION_ACTION_TYPES = [
  "approve_scenario",
  "request_revision",
  "generate_reorganization_proposal",
  "compare_scenarios",
] as const

export type DecisionActionType =
  (typeof DECISION_ACTION_TYPES)[number]

export type DecisionAction =
  Readonly<{
    id: string
    type: DecisionActionType
    label: string
    description: string
    recommended: boolean
  }>

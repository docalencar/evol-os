import {
  assertApprovalDomain,
} from "../errors/approval-domain-error"
import type {
  ApprovalPrincipal,
} from "./approval-principal"
import {
  createApprovalPrincipal,
} from "./approval-principal"
import {
  optionalText,
  requireText,
} from "./shared"

export const APPROVAL_DECISION_RULES = [
  "any",
] as const

export type ApprovalDecisionRule =
  (typeof APPROVAL_DECISION_RULES)[number]

export type ApprovalPlanAssignmentSnapshot = Readonly<{
  assignmentId: string
  principal: ApprovalPrincipal
}>

export type ApprovalPlanStageSnapshot = Readonly<{
  stageId: string
  sequence: number
  name: string
  decisionRule: ApprovalDecisionRule
  assignments: readonly ApprovalPlanAssignmentSnapshot[]
}>

export type ApprovalPlanSnapshot = Readonly<{
  policyId: string | null
  policyVersion: string | null
  stages: readonly ApprovalPlanStageSnapshot[]
}>

export type CreateApprovalPlanSnapshotInput = {
  policyId?: string | null
  policyVersion?: string | null
  stages: Array<{
    stageId: string
    sequence: number
    name: string
    decisionRule?: ApprovalDecisionRule
    assignments: Array<{
      assignmentId: string
      principal: ApprovalPrincipal
    }>
  }>
}

export function createApprovalPlanSnapshot(
  input: CreateApprovalPlanSnapshotInput
): ApprovalPlanSnapshot {
  assertApprovalDomain(
    input.stages.length > 0,
    "invalid_input",
    "O plano de aprovação deve possuir ao menos uma etapa."
  )

  const orderedStages = [...input.stages].sort(
    (left, right) => left.sequence - right.sequence
  )
  const stageIds = new Set<string>()
  const assignmentIds = new Set<string>()

  const stages = orderedStages.map((stage, index) => {
    const stageId = requireText(stage.stageId, "stageId")

    assertApprovalDomain(
      stage.sequence === index + 1,
      "invalid_input",
      "As etapas do plano devem possuir sequência contínua iniciada em 1.",
      { stageId, sequence: stage.sequence }
    )
    assertApprovalDomain(
      !stageIds.has(stageId),
      "invalid_input",
      "O plano não pode possuir etapas duplicadas.",
      { stageId }
    )
    assertApprovalDomain(
      stage.assignments.length > 0,
      "invalid_input",
      "Cada etapa deve possuir ao menos um aprovador.",
      { stageId }
    )

    stageIds.add(stageId)

    const principalKeys = new Set<string>()

    const assignments = stage.assignments.map(
      (assignment) => {
        const assignmentId = requireText(
          assignment.assignmentId,
          "assignmentId"
        )

        assertApprovalDomain(
          !assignmentIds.has(assignmentId),
          "invalid_input",
          "O plano não pode possuir atribuições duplicadas.",
          { assignmentId }
        )

        assignmentIds.add(assignmentId)

        const principal = createApprovalPrincipal(
          assignment.principal
        )
        const principalKey = [
          principal.principalType,
          principal.principalId,
        ].join(":")

        assertApprovalDomain(
          !principalKeys.has(principalKey),
          "invalid_input",
          "Uma etapa não pode atribuir o mesmo aprovador mais de uma vez.",
          { stageId, principalKey }
        )

        principalKeys.add(principalKey)

        return Object.freeze({
          assignmentId,
          principal,
        })
      }
    )

    return Object.freeze({
      stageId,
      sequence: stage.sequence,
      name: requireText(stage.name, "stage.name"),
      decisionRule: stage.decisionRule ?? "any",
      assignments: Object.freeze(assignments),
    })
  })

  const policyId = optionalText(input.policyId)
  const policyVersion = optionalText(input.policyVersion)

  assertApprovalDomain(
    Boolean(policyId) === Boolean(policyVersion),
    "invalid_input",
    "policyId e policyVersion devem ser informados juntos."
  )

  return Object.freeze({
    policyId,
    policyVersion,
    stages: Object.freeze(stages),
  })
}

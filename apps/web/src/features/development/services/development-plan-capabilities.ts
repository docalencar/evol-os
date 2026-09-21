import type { CorporateRole } from "@/features/authorization"
import type { Employee } from "@/features/people"

import type { DevelopmentPlan } from "../types/development-plan"
import type { DevelopmentReview } from "../types/development-review"

export type DevelopmentPlanCapabilities = {
  canActivate: boolean
  canCompletePlan: boolean
  canExecuteActions: boolean
  canManage: boolean
  canRecordReview: boolean
  canSkipActions: boolean
}

export function resolveDevelopmentPlanCapabilities(input: {
  plan: DevelopmentPlan
  subject: Employee | null
  owner: Employee | null
  actorPersonId: string | null
  actorRole: CorporateRole
}): DevelopmentPlanCapabilities {
  const { plan, subject, owner, actorPersonId, actorRole } = input
  const administrative = actorRole === "owner" || actorRole === "admin" || actorRole === "hr"
  const manages = administrative || (
    actorPersonId !== null &&
    (
      (actorPersonId === plan.ownerId && owner?.status === "active") ||
      (subject?.status !== "terminated" && actorPersonId === subject?.manager_id)
    )
  )
  const active = plan.status === "active"

  return {
    canActivate: manages && plan.status === "draft",
    canCompletePlan: manages && active,
    canExecuteActions: active && actorPersonId === plan.employeeId,
    canManage: manages,
    canRecordReview: manages && active,
    canSkipActions: manages && active,
  }
}

export function getPlanCompletionPrerequisites(
  plan: DevelopmentPlan,
  reviews: DevelopmentReview[]
) {
  const hasActions = plan.totalActions > 0
  const actionsTerminal = hasActions &&
    plan.completedActions + plan.skippedActions === plan.totalActions
  const hasCompletedAction = plan.completedActions > 0
  const hasFinalReview = reviews.some((review) => review.type === "final")

  return {
    hasActions,
    actionsTerminal,
    hasCompletedAction,
    hasFinalReview,
    ready: hasActions && actionsTerminal && hasCompletedAction && hasFinalReview,
  }
}

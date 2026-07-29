import type { EmployeeNextAction } from "../types/employee-next-action"
import type { DevelopmentPlan } from "@/features/development"

const REVIEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

type EmployeeNextActionsInput = Readonly<{
  criticalGap: string | null
  activePlans: number
  pendingAssessments: number
  nextDevelopmentPlan: Pick<DevelopmentPlan, "status" | "dueDate"> | null
}>

export function createEmployeeNextActions(
  input: EmployeeNextActionsInput,
  currentDate: Date = new Date()
): EmployeeNextAction[] {
  const actions: EmployeeNextAction[] = []

  if (input.criticalGap) {
    actions.push({
      id: `develop-competency-${input.criticalGap}`,
      title: `Desenvolver ${input.criticalGap}`,
      description: "Priorizar esta competência por causa do gap identificado.",
      type: "develop-competency",
      priority: "high",
    })
  }

  if (input.criticalGap && input.activePlans === 0) {
    actions.push({
      id: "create-development-plan",
      title: "Criar PDI",
      description: "Criar um plano para acompanhar o desenvolvimento do gap identificado.",
      type: "create-development-plan",
      priority: "high",
    })
  }

  if (input.pendingAssessments > 0) {
    actions.push({
      id: "complete-assessment",
      title: "Concluir avaliação pendente",
      description: `${input.pendingAssessments} avaliação(ões) ainda aguardam conclusão.`,
      type: "start-assessment",
      priority: "medium",
    })
  }

  const reviewDueDate = getReviewDueDate(
    input.nextDevelopmentPlan,
    currentDate
  )

  if (reviewDueDate) {
    actions.push({
      id: "review-development-plan",
      title: "Revisar prazo do PDI",
      description: `O próximo prazo do plano é ${reviewDueDate}.`,
      type: "review-development-plan",
      priority: "medium",
    })
  }

  return actions
}

function getReviewDueDate(
  plan: EmployeeNextActionsInput["nextDevelopmentPlan"],
  currentDate: Date
): string | null {
  if (plan?.status !== "active" || plan.dueDate === null) return null

  const currentTimestamp = currentDate.getTime()
  const dueTimestamp = Date.parse(plan.dueDate)

  if (!Number.isFinite(currentTimestamp) || !Number.isFinite(dueTimestamp)) {
    return null
  }

  const timeUntilDue = dueTimestamp - currentTimestamp

  return timeUntilDue <= REVIEW_WINDOW_MS ? plan.dueDate : null
}

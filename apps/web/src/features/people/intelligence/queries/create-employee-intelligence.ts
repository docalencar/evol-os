import type { Employee } from "../../types/employee"
import type { EmployeeIntelligence } from "../types/employee-intelligence"
import type { EmployeeAssessmentSummary } from "@/features/assessments"
import type { Competency } from "@/features/competencies"
import type { EmployeeCompetency } from "@/features/competencies/employee-competencies"
import type { DevelopmentPlan } from "@/features/development"
import { getBiggestGap, type CompetencyGap } from "@/features/talent"
import { createEmployeeNextActions } from "../services/create-employee-next-actions"

type EmployeeIntelligenceSource = Employee & {
  positions?: {
    name: string
  } | null
}

export function createEmployeeIntelligence(
  employee: EmployeeIntelligenceSource,
  data?: Readonly<{
    assessments: EmployeeAssessmentSummary
    developmentPlans: readonly DevelopmentPlan[]
    employeeCompetencies: readonly EmployeeCompetency[]
    competencies: readonly Competency[]
    competencyGaps: readonly CompetencyGap[]
  }>,
  currentDate: Date = new Date()
): EmployeeIntelligence {

  const assessments = data?.assessments ?? {
    completedAssessments: 0,
    pendingAssessments: 0,
    averageScore: null,
    latestAssessmentAt: null,
  }
  const activePlans = data?.developmentPlans.filter((plan) => plan.status === "active") ?? []
  const completedPlans = data?.developmentPlans.filter((plan) => plan.status === "completed") ?? []
  const priorityPlan = [...activePlans].sort((left, right) => {
    const priority = { high: 0, medium: 1, low: 2 }
    return priority[left.priority] - priority[right.priority]
  })[0] ?? null
  const duePlans = activePlans
    .filter((plan) => plan.dueDate)
    .sort((left, right) => (left.dueDate ?? "").localeCompare(right.dueDate ?? ""))
  const competencyNames = new Map(
    data?.competencies.map((competency) => [competency.id, competency.name]) ?? []
  )
  const strongest = [...(data?.employeeCompetencies ?? [])]
    .filter((competency) => competency.archived_at === null)
    .sort((left, right) => right.current_level - left.current_level)[0]
  const biggestGap = getBiggestGap([...(data?.competencyGaps ?? [])])

  return {

    profile: {
      employeeId: employee.id,
      fullName: employee.full_name,
      position: employee.positions?.name ?? null,
      department: null,
    },

    assessments: {
      ...assessments,
    },

    development: {
      activePlans: activePlans.length,
      completedPlans: completedPlans.length,
      priorityPlan: priorityPlan?.title ?? null,
      nextDueDate: duePlans[0]?.dueDate ?? null,
    },

    competencies: {
      strongestCompetency: strongest
        ? competencyNames.get(strongest.competency_id) ?? null
        : null,
      weakestCompetency: biggestGap,
    },

    timeline: {
      latestAssessmentAt: assessments.latestAssessmentAt,
    },

    insights: {
      strengths: [],
      opportunities: biggestGap ? [biggestGap] : [],
      nextActions: createEmployeeNextActions({
        criticalGap: biggestGap,
        activePlans: activePlans.length,
        pendingAssessments: assessments.pendingAssessments,
        nextDevelopmentPlan: duePlans[0] ?? null,
      }, currentDate),
    },

  }

}

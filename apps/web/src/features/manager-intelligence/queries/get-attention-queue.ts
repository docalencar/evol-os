import {
  getEmployeeIntelligenceList,
} from "@/features/people"

import type { AttentionItem } from "../types/attention-item"

export async function getAttentionQueue(
  companyId: string
): Promise<AttentionItem[]> {
  const employees =
    await getEmployeeIntelligenceList(companyId)

  return employees.map((intelligence) => {
    const hasActiveDevelopmentPlan =
      intelligence.development.activePlans > 0

    return {
      employeeId: intelligence.profile.employeeId,
      employeeName: intelligence.profile.fullName,
      positionName: intelligence.profile.position,
      departmentName: intelligence.profile.department,
      priority: hasActiveDevelopmentPlan
        ? "low"
        : "high",
      reasonType: hasActiveDevelopmentPlan
        ? "recognition"
        : "missing-development-plan",
      reason: hasActiveDevelopmentPlan
        ? "O colaborador possui desenvolvimento em andamento."
        : "O colaborador ainda não possui PDI ativo.",
      recommendedAction: hasActiveDevelopmentPlan
        ? "Acompanhar desenvolvimento"
        : "Criar PDI",
      healthScore: null,
      updatedAt:
        intelligence.timeline.latestAssessmentAt,
    }
  })
}

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import {
  getWorkforceHealth,
  getOrganizationalRisks,
  getWorkforceInsights,
} from "@/features/hr-intelligence"

export async function getCopilotBriefing() {
  const { companyId } =
    await getCurrentCompanyContext()

  const health =
    await getWorkforceHealth(companyId)

  const risks =
    await getOrganizationalRisks(health)

  const insights =
    await getWorkforceInsights(health)

  return {
    totalSuggestions:
      risks.length +
      insights.length,

    managerActions:
      health.criticalEmployees +
      health.attentionEmployees,

    organizationalRisks:
      risks.length,

    workforceInsights:
      insights.length,
  }
}

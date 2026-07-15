import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  getWorkforceHealth,
  getOrganizationalRisks,
} from "@/features/hr-intelligence"

import {
  getCopilotBriefing,
} from "@/features/ai-copilot"

import type { ExecutiveOverview } from "../types/executive-overview"

export async function getExecutiveOverview(): Promise<ExecutiveOverview> {
  const { companyId } =
    await getCurrentCompanyContext()

  const health =
    await getWorkforceHealth(companyId)

  const risks =
    await getOrganizationalRisks(health)

  const briefing =
    await getCopilotBriefing()

  return {
    totalEmployees: health.totalEmployees,
    criticalEmployees: health.criticalEmployees,
    organizationalRisks: risks.length,
    aiSuggestions: briefing.totalSuggestions,
  }
}

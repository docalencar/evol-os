import { createExecutiveDashboardService, ExecutiveDashboardPage } from "@/features/organization-planning/executive-dashboard"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function ExecutivePlanningDashboardRoute({ params }: { params: Promise<{ scenarioId: string }> }) {
  const [{ scenarioId }, { companyId }] = await Promise.all([params, getCurrentCompanyContext()])
  const service = await createExecutiveDashboardService(companyId)
  return <ExecutiveDashboardPage dashboard={await service.execute(scenarioId)} />
}

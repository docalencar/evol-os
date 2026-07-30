import { ExecutiveDashboardPage } from "@/features/organization-planning/executive-dashboard"
import { createExecutiveNavigationService, ExecutiveLayout } from "@/features/organization-planning/executive-experience"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function ExecutivePlanningDashboardRoute({ params }: { params: Promise<{ scenarioId: string }> }) {
  const [{ scenarioId }, { companyId }] = await Promise.all([params, getCurrentCompanyContext()])
  const service = await createExecutiveNavigationService(companyId)
  const experience = await service.execute(scenarioId)
  return <ExecutiveLayout experience={experience}><ExecutiveDashboardPage dashboard={experience.dashboard} /></ExecutiveLayout>
}

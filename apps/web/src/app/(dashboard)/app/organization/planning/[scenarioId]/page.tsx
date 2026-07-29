import { createPlanningReadService } from "@/features/organization-planning/application"
import { PlanningDashboardPage } from "@/features/organization-planning/planning-dashboard"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

type PlanningScenarioDashboardRouteProps = {
  params: Promise<{ scenarioId: string }>
}

export default async function PlanningScenarioDashboardRoute({ params }: PlanningScenarioDashboardRouteProps) {
  const [{ scenarioId }, { companyId }] = await Promise.all([
    params,
    getCurrentCompanyContext(),
  ])
  const service = await createPlanningReadService(companyId)
  const dashboard = await service.execute(scenarioId)

  return <PlanningDashboardPage dashboard={dashboard} />
}

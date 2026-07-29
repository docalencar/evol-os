import { notFound } from "next/navigation"

import { createPlanningTimelineService } from "@/features/organization-planning/timeline"
import { PlanningTimelinePage } from "@/features/organization-planning/timeline-ui"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

type PlanningTimelineRouteProps = {
  searchParams: Promise<{ workspaceId?: string }>
}

export default async function PlanningTimelineRoute({ searchParams }: PlanningTimelineRouteProps) {
  const [{ workspaceId }, { companyId }] = await Promise.all([
    searchParams,
    getCurrentCompanyContext(),
  ])

  if (!workspaceId) notFound()

  const service = await createPlanningTimelineService(companyId)
  const timeline = await service.execute({ workspaceId })

  return <PlanningTimelinePage timeline={timeline} />
}

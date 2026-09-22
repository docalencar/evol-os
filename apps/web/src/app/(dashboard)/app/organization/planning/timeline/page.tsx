import { notFound } from "next/navigation"

import { createPlanningTimelineService } from "@/features/organization-planning/timeline"
import { PlanningTimelinePage } from "@/features/organization-planning/timeline-ui"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

type PlanningTimelineRouteProps = {
  searchParams: Promise<{ workspaceId?: string }>
}

export default async function PlanningTimelineRoute({ searchParams }: PlanningTimelineRouteProps) {
  const [{ workspaceId }, { companyId, currentUser }] = await Promise.all([
    searchParams,
    getCurrentCompanyContext(),
  ])

  if (!workspaceId) notFound()

  const service = await createPlanningTimelineService(companyId)
  const timeline = await service.execute({ workspaceId })
  const canManage = ["owner", "admin", "hr"].includes(currentUser.role)

  return <PlanningTimelinePage timeline={timeline} canManage={canManage} />
}

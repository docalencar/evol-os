import type { PlanningTimelineViewModel } from "../timeline"
import { Timeline } from "./components/timeline"
import { TimelineEmptyState } from "./components/timeline-empty-state"
import { TimelineHeader } from "./components/timeline-header"

type PlanningTimelinePageProps = {
  timeline: PlanningTimelineViewModel
  includeArchived?: boolean
}

export function PlanningTimelinePage({ timeline, includeArchived = false }: PlanningTimelinePageProps) {
  return (
    <div className="space-y-8">
      <TimelineHeader workspaceId={timeline.workspaceId} includeArchived={includeArchived} />
      {timeline.isEmpty ? <TimelineEmptyState /> : <Timeline timeline={timeline} />}
    </div>
  )
}

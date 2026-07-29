import type { PlanningTimelineViewModel } from "../timeline"
import { Timeline } from "./components/timeline"
import { TimelineEmptyState } from "./components/timeline-empty-state"
import { TimelineHeader } from "./components/timeline-header"

type PlanningTimelinePageProps = {
  timeline: PlanningTimelineViewModel
}

export function PlanningTimelinePage({ timeline }: PlanningTimelinePageProps) {
  return (
    <div className="space-y-8">
      <TimelineHeader workspaceId={timeline.workspaceId} />
      {timeline.isEmpty ? <TimelineEmptyState /> : <Timeline timeline={timeline} />}
    </div>
  )
}

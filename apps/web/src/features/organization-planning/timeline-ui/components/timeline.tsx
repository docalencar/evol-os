import type { PlanningTimelineViewModel } from "../../timeline"
import { TimelineItem } from "./timeline-item"

type TimelineProps = {
  timeline: PlanningTimelineViewModel
  canManage: boolean
}

export function Timeline({ timeline, canManage }: TimelineProps) {
  return (
    <ol aria-label="Evolução dos cenários" className="space-y-6">
      {timeline.items.map((item, index) => (
        <TimelineItem
          key={item.id}
          item={item}
          showConnector={index < timeline.items.length - 1}
          canManage={canManage}
        />
      ))}
    </ol>
  )
}

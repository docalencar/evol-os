import type { PlanningTimelineViewModel } from "../../timeline"
import { TimelineItem } from "./timeline-item"

type TimelineProps = {
  timeline: PlanningTimelineViewModel
}

export function Timeline({ timeline }: TimelineProps) {
  return (
    <ol aria-label="Evolução dos cenários" className="space-y-6">
      {timeline.items.map((item, index) => (
        <TimelineItem
          key={item.id}
          item={item}
          showConnector={index < timeline.items.length - 1}
        />
      ))}
    </ol>
  )
}

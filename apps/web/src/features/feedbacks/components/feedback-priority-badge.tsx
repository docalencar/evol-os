import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import {
  FEEDBACK_THREAD_PRIORITY_LABELS,
} from "../constants/feedback-constants"
import type {
  FeedbackThreadPriority,
} from "../types/feedback"

type FeedbackPriorityBadgeProps = {
  priority: FeedbackThreadPriority
}

const PRIORITY_CLASS_NAMES: Record<
  FeedbackThreadPriority,
  string
> = {
  low:
    "bg-slate-100 text-slate-600",
  normal:
    "bg-blue-50 text-blue-700",
  high:
    "bg-red-50 text-red-700",
}

export function FeedbackPriorityBadge({
  priority,
}: FeedbackPriorityBadgeProps) {
  return (
    <Badge
      className={cn(
        "whitespace-nowrap",
        PRIORITY_CLASS_NAMES[priority]
      )}
    >
      {FEEDBACK_THREAD_PRIORITY_LABELS[priority]}
    </Badge>
  )
}

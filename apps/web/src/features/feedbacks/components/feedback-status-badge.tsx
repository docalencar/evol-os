import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import {
  FEEDBACK_THREAD_STATUS_LABELS,
} from "../constants/feedback-constants"
import type {
  FeedbackThreadStatus,
} from "../types/feedback"

type FeedbackStatusBadgeProps = {
  status: FeedbackThreadStatus
}

const STATUS_CLASS_NAMES: Record<
  FeedbackThreadStatus,
  string
> = {
  open:
    "bg-blue-50 text-blue-700",
  awaiting_acknowledgement:
    "bg-amber-50 text-amber-700",
  acknowledged:
    "bg-emerald-50 text-emerald-700",
  closed:
    "bg-slate-100 text-slate-700",
  archived:
    "bg-slate-100 text-slate-500",
}

export function FeedbackStatusBadge({
  status,
}: FeedbackStatusBadgeProps) {
  return (
    <Badge
      className={cn(
        "whitespace-nowrap",
        STATUS_CLASS_NAMES[status]
      )}
    >
      {FEEDBACK_THREAD_STATUS_LABELS[status]}
    </Badge>
  )
}

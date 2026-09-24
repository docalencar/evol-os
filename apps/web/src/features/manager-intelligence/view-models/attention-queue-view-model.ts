import type {
  AttentionPriority,
  AttentionReasonType,
} from "../types/attention-item"

export type AttentionQueueItemViewModel = {
  id: string
  subjectId: string
  subjectName: string
  subjectStatusLabel: string
  priority: AttentionPriority
  priorityLabel: string
  reasonType: AttentionReasonType
  reasonLabel: string
  sourceStatusLabel: string
  dueDateLabel: string | null
  actionLabel: string
  actionHref: string
  sourceUpdatedAt: string | null
}

export type AttentionQueueViewModel = {
  items: AttentionQueueItemViewModel[]
  total: number
  high: number
  medium: number
  low: number
  empty: boolean
}

import type {
  AttentionPriority,
  AttentionReasonType,
} from "../types/attention-item"

export type AttentionQueueActionViewModel = {
  id: string
  label: string
  href: string
  estimatedMinutes: number
}

export type AttentionQueueItemViewModel = {
  employeeId: string
  employeeName: string
  contextLabel: string
  priority: AttentionPriority
  priorityLabel: string
  reasonType: AttentionReasonType
  reason: string
  recommendedActions: AttentionQueueActionViewModel[]
  impact: string
  healthScore: number | null
  healthScoreLabel: string
  decisionScore: number
  decisionSummary: string
  updatedAt: string | null
}

export type AttentionQueueViewModel = {
  topPriority: AttentionQueueItemViewModel | null
  items: AttentionQueueItemViewModel[]
  total: number
  critical: number
  high: number
  medium: number
  low: number
  empty: boolean
}

import type { FeedbackThread } from "./feedback"

export type FeedbackExecutiveDashboard = Readonly<{
  threads: readonly FeedbackThread[]

  summary: Readonly<{
    total: number
    open: number
    awaitingAcknowledgement: number
    acknowledged: number
    closed: number
    archived: number
    highPriority: number
    pendingFollowUp: number
  }>
}>

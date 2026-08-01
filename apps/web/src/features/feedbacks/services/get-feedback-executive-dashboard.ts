import { getFeedbackThreads } from "../queries/get-feedback-threads"
import type { FeedbackExecutiveDashboard } from "../types/feedback-executive-dashboard"

export async function getFeedbackExecutiveDashboard(
  companyId: string,
): Promise<FeedbackExecutiveDashboard> {
  const threads = await getFeedbackThreads({
    companyId,
  })

  return Object.freeze({
    threads: Object.freeze(threads),

    summary: Object.freeze({
      total: threads.length,

      open: threads.filter(
        (thread) => thread.status === "open",
      ).length,

      awaitingAcknowledgement: threads.filter(
        (thread) =>
          thread.status === "awaiting_acknowledgement",
      ).length,

      acknowledged: threads.filter(
        (thread) => thread.status === "acknowledged",
      ).length,

      closed: threads.filter(
        (thread) => thread.status === "closed",
      ).length,

      archived: threads.filter(
        (thread) => thread.status === "archived",
      ).length,

      highPriority: threads.filter(
        (thread) => thread.priority === "high",
      ).length,

      pendingFollowUp: threads.filter(
        (thread) =>
          thread.requiresFollowUp &&
          thread.status !== "closed" &&
          thread.status !== "archived",
      ).length,
    }),
  })
}

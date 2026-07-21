import {
  Inbox,
  MessageSquareText,
  Send,
  Timer,
} from "lucide-react"

import {
  StatCard,
} from "@/components/dashboard"

import type {
  FeedbackThread,
} from "../types/feedback"

type FeedbackDashboardKpiCardsProps = {
  threads: FeedbackThread[]
  currentEmployeeId: string
}

export function FeedbackDashboardKpiCards({
  threads,
  currentEmployeeId,
}: FeedbackDashboardKpiCardsProps) {
  const receivedThreads = threads.filter(
    (thread) =>
      thread.receiverEmployeeId ===
      currentEmployeeId
  )

  const sentThreads = threads.filter(
    (thread) =>
      thread.senderEmployeeId ===
      currentEmployeeId
  )

  const awaitingAcknowledgement =
    threads.filter(
      (thread) =>
        thread.status ===
        "awaiting_acknowledgement"
    )

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Conversas"
        value={threads.length}
        description="Total em que você participa"
        icon={
          <MessageSquareText size={20} />
        }
      />

      <StatCard
        label="Recebidos"
        value={receivedThreads.length}
        description="Feedbacks recebidos"
        icon={<Inbox size={20} />}
      />

      <StatCard
        label="Enviados"
        value={sentThreads.length}
        description="Feedbacks iniciados por você"
        icon={<Send size={20} />}
      />

      <StatCard
        label="Aguardando confirmação"
        value={awaitingAcknowledgement.length}
        description="Conversas pendentes"
        icon={<Timer size={20} />}
      />
    </div>
  )
}

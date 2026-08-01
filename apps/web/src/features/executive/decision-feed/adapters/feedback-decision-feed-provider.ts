import type { FeedbackExecutiveDashboard } from "@/features/feedbacks/types/feedback-executive-dashboard"
import type { FeedbackThread } from "@/features/feedbacks/types/feedback"

import type { DecisionFeedProvider } from "../aggregators"
import type {
  DecisionFeedCategory,
  DecisionFeedDTO,
  DecisionFeedItemDTO,
  DecisionFeedPriority,
} from "../types"

export type FeedbackExecutiveDashboardSource = Readonly<{
  load(): Promise<FeedbackExecutiveDashboard>
}>

export class FeedbackDecisionFeedProvider
  implements DecisionFeedProvider
{
  readonly key = "feedback"

  constructor(
    private readonly generatedAt: string,
    private readonly source: FeedbackExecutiveDashboardSource,
  ) {}

  async load(): Promise<DecisionFeedDTO> {
    const dashboard = await this.source.load()

    const items = dashboard.threads
      .filter(isExecutiveSignal)
      .map((thread) =>
        mapFeedbackThread(
          thread,
          this.generatedAt,
        ),
      )

    return Object.freeze({
      generatedAt: this.generatedAt,
      items: Object.freeze(items),
    })
  }
}

function isExecutiveSignal(
  thread: FeedbackThread,
): boolean {
  if (
    thread.status === "closed" ||
    thread.status === "archived"
  ) {
    return false
  }

  return (
    thread.priority === "high" ||
    thread.status === "awaiting_acknowledgement" ||
    thread.requiresFollowUp
  )
}

function mapFeedbackThread(
  thread: FeedbackThread,
  generatedAt: string,
): DecisionFeedItemDTO {
  const priority = resolvePriority(
    thread,
    generatedAt,
  )

  return Object.freeze({
    id: `feedback-thread:${thread.id}`,
    source: "feedback",
    category: resolveCategory(thread),
    priority,
    title: resolveTitle(
      thread,
      generatedAt,
    ),
    description: resolveDescription(
      thread,
      generatedAt,
    ),
    occurredAt:
      thread.followUpAt?.toISOString() ??
      thread.updatedAt.toISOString(),
    href: `/app/feedbacks/${thread.id}`,
    badges: Object.freeze([
      getStatusLabel(thread.status),
      getPriorityLabel(thread.priority),
      ...(thread.requiresFollowUp
        ? ["Requer acompanhamento"]
        : []),
    ]),
  })
}

function resolveCategory(
  thread: FeedbackThread,
): DecisionFeedCategory {
  if (
    thread.status === "awaiting_acknowledgement"
  ) {
    return "approval"
  }

  if (thread.requiresFollowUp) {
    return "recommendation"
  }

  return "people"
}

function resolvePriority(
  thread: FeedbackThread,
  generatedAt: string,
): DecisionFeedPriority {
  if (
    thread.requiresFollowUp &&
    isFollowUpOverdue(thread, generatedAt)
  ) {
    return "critical"
  }

  if (
    thread.priority === "high" ||
    thread.status === "awaiting_acknowledgement"
  ) {
    return "high"
  }

  if (
    thread.requiresFollowUp &&
    isFollowUpNear(thread, generatedAt)
  ) {
    return "medium"
  }

  return "low"
}

function resolveTitle(
  thread: FeedbackThread,
  generatedAt: string,
): string {
  if (
    thread.requiresFollowUp &&
    isFollowUpOverdue(thread, generatedAt)
  ) {
    return `Acompanhamento de feedback atrasado: ${thread.title}`
  }

  if (
    thread.status === "awaiting_acknowledgement"
  ) {
    return `Feedback aguardando confirmação: ${thread.title}`
  }

  if (thread.requiresFollowUp) {
    return `Acompanhamento de feedback: ${thread.title}`
  }

  return `Feedback prioritário: ${thread.title}`
}

function resolveDescription(
  thread: FeedbackThread,
  generatedAt: string,
): string {
  if (
    thread.requiresFollowUp &&
    thread.followUpAt
  ) {
    const state = isFollowUpOverdue(
      thread,
      generatedAt,
    )
      ? "O acompanhamento está atrasado."
      : "Existe um acompanhamento programado."

    return `${state} Data prevista: ${formatDate(thread.followUpAt)}.`
  }

  if (
    thread.status === "awaiting_acknowledgement"
  ) {
    return "A conversa está aguardando confirmação de recebimento."
  }

  return "A conversa possui prioridade alta e requer atenção da liderança."
}

function isFollowUpOverdue(
  thread: FeedbackThread,
  generatedAt: string,
): boolean {
  if (!thread.followUpAt) {
    return false
  }

  return (
    thread.followUpAt.getTime() <
    new Date(generatedAt).getTime()
  )
}

function isFollowUpNear(
  thread: FeedbackThread,
  generatedAt: string,
): boolean {
  if (!thread.followUpAt) {
    return false
  }

  const difference =
    thread.followUpAt.getTime() -
    new Date(generatedAt).getTime()

  return (
    difference >= 0 &&
    difference <= 7 * 86_400_000
  )
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date)
}

function getStatusLabel(
  status: FeedbackThread["status"],
): string {
  switch (status) {
    case "open":
      return "Aberto"
    case "awaiting_acknowledgement":
      return "Aguardando confirmação"
    case "acknowledged":
      return "Confirmado"
    case "closed":
      return "Encerrado"
    case "archived":
      return "Arquivado"
  }
}

function getPriorityLabel(
  priority: FeedbackThread["priority"],
): string {
  switch (priority) {
    case "high":
      return "Prioridade alta"
    case "normal":
      return "Prioridade normal"
    case "low":
      return "Prioridade baixa"
  }
}

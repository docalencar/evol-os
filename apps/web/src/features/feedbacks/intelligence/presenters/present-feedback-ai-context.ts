import type {
  FeedbackAiContext,
} from "../context"

const THREAD_TYPE_LABELS = {
  feedback: "Feedback",
  feedforward: "Feedforward",
  recognition: "Reconhecimento",
  check_in: "Check-in",
  one_on_one: "One-on-one",
} as const

const THREAD_STATUS_LABELS = {
  open: "Aberta",
  awaiting_acknowledgement:
    "Aguardando confirmação",
  acknowledged: "Confirmada",
  closed: "Encerrada",
  archived: "Arquivada",
} as const

const THREAD_PRIORITY_LABELS = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
} as const

const THREAD_VISIBILITY_LABELS = {
  participants: "Participantes",
  management: "Gestão",
  hr: "RH",
} as const

export type FeedbackAiContextPresentation = {
  title: string
  summary: string
  transcript: string
  structuredContext: FeedbackAiContext
}

function formatDate(
  date: string | null,
  locale: string,
  timeZone: string
) {
  if (!date) {
    return "Não informado"
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone,
  }).format(new Date(date))
}

function createSummary(
  context: FeedbackAiContext
) {
  const { conversation, metrics } =
    context

  return [
    `Tipo: ${
      THREAD_TYPE_LABELS[
        conversation.type
      ]
    }`,
    `Status: ${
      THREAD_STATUS_LABELS[
        conversation.status
      ]
    }`,
    `Prioridade: ${
      THREAD_PRIORITY_LABELS[
        conversation.priority
      ]
    }`,
    `Visibilidade: ${
      THREAD_VISIBILITY_LABELS[
        conversation.visibility
      ]
    }`,
    `Mensagens: ${metrics.totalMessages}`,
    `Autores: ${metrics.uniqueAuthors}`,
    `Requer acompanhamento: ${
      conversation.requiresFollowUp
        ? "Sim"
        : "Não"
    }`,
  ].join("\n")
}

function createTranscript(
  context: FeedbackAiContext
) {
  if (context.messages.length === 0) {
    return "A conversa não possui mensagens."
  }

  return context.messages
    .map((message) => {
      const occurredAt = formatDate(
        message.createdAt,
        context.locale,
        context.timeZone
      )

      const editedLabel =
        message.editedAt
          ? " — editada"
          : ""

      return [
        `[${occurredAt}] ${message.authorName}${editedLabel}`,
        message.content,
      ].join("\n")
    })
    .join("\n\n")
}

export function presentFeedbackAiContext(
  context: FeedbackAiContext
): FeedbackAiContextPresentation {
  return {
    title:
      context.conversation.title,

    summary:
      createSummary(context),

    transcript:
      createTranscript(context),

    structuredContext: context,
  }
}

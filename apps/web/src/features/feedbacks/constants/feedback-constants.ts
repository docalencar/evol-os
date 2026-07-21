import type {
  FeedbackMessageType,
  FeedbackThreadPriority,
  FeedbackThreadStatus,
  FeedbackThreadType,
  FeedbackThreadVisibility,
} from "../types/feedback"

export const FEEDBACK_THREAD_TYPES = [
  "feedback",
  "feedforward",
  "recognition",
  "check_in",
  "one_on_one",
] as const satisfies readonly FeedbackThreadType[]

export const FEEDBACK_THREAD_STATUSES = [
  "open",
  "awaiting_acknowledgement",
  "acknowledged",
  "closed",
  "archived",
] as const satisfies readonly FeedbackThreadStatus[]

export const FEEDBACK_THREAD_PRIORITIES = [
  "low",
  "normal",
  "high",
] as const satisfies readonly FeedbackThreadPriority[]

export const FEEDBACK_THREAD_VISIBILITIES = [
  "participants",
  "management",
  "hr",
] as const satisfies readonly FeedbackThreadVisibility[]

export const FEEDBACK_MESSAGE_TYPES = [
  "message",
  "summary",
  "system",
] as const satisfies readonly FeedbackMessageType[]

export const FEEDBACK_THREAD_TYPE_LABELS = {
  feedback: "Feedback",
  feedforward: "Feedforward",
  recognition: "Reconhecimento",
  check_in: "Check-in",
  one_on_one: "One-on-one",
} satisfies Record<
  FeedbackThreadType,
  string
>

export const FEEDBACK_THREAD_STATUS_LABELS = {
  open: "Aberto",
  awaiting_acknowledgement:
    "Aguardando confirmação",
  acknowledged: "Confirmado",
  closed: "Encerrado",
  archived: "Arquivado",
} satisfies Record<
  FeedbackThreadStatus,
  string
>

export const FEEDBACK_THREAD_PRIORITY_LABELS = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
} satisfies Record<
  FeedbackThreadPriority,
  string
>

export const FEEDBACK_THREAD_VISIBILITY_LABELS = {
  participants: "Participantes",
  management: "Gestão",
  hr: "Recursos Humanos",
} satisfies Record<
  FeedbackThreadVisibility,
  string
>

export const FEEDBACK_MESSAGE_TYPE_LABELS = {
  message: "Mensagem",
  summary: "Resumo",
  system: "Sistema",
} satisfies Record<
  FeedbackMessageType,
  string
>

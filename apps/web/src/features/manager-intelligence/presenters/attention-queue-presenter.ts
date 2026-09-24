import type {
  AttentionItem,
  AttentionPriority,
  AttentionReasonType,
} from "../types/attention-item"
import type {
  AttentionQueueItemViewModel,
  AttentionQueueViewModel,
} from "../view-models/attention-queue-view-model"

const PRIORITY_LABELS: Record<AttentionPriority, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
}

const REASON_LABELS: Record<AttentionReasonType, string> = {
  assigned_assessment_overdue: "Avaliação atribuída em atraso",
  assigned_assessment_pending: "Avaliação atribuída pendente",
  formal_feedback_pending: "Feedback formal pendente",
  development_follow_up_overdue: "Acompanhamento do PDI em atraso",
  development_follow_up_due: "Acompanhamento do PDI próximo do prazo",
  development_plan_missing: "PDI não iniciado",
}

const SUBJECT_STATUS_LABELS: Record<AttentionItem["subjectStatus"], string> = {
  active: "Pessoa ativa",
  on_leave: "Pessoa afastada",
}

const SOURCE_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  in_progress: "Em andamento",
  submitted: "Enviada",
  completed: "Concluída",
  active: "Ativo",
  missing: "Ausente",
}

function actionFor(item: AttentionItem): Pick<
  AttentionQueueItemViewModel,
  "actionHref" | "actionLabel"
> {
  switch (item.reason) {
    case "assigned_assessment_overdue":
    case "assigned_assessment_pending":
      return {
        actionHref: `/app/assessments/responses/${item.sourceId}`,
        actionLabel: "Responder avaliação",
      }
    case "formal_feedback_pending":
      return {
        actionHref: `/app/assessments/responses/${item.sourceId}`,
        actionLabel: "Iniciar feedback formal",
      }
    case "development_follow_up_overdue":
    case "development_follow_up_due":
      return {
        actionHref: `/app/development/plans/${item.sourceId}`,
        actionLabel: "Acompanhar PDI",
      }
    case "development_plan_missing":
      return {
        actionHref: `/app/development?applyFor=${encodeURIComponent(item.subjectId)}`,
        actionLabel: "Aplicar template de PDI",
      }
  }
}

function formatDate(date: string | null): string | null {
  if (!date) {
    return null
  }

  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`)
  )
}

function presentItem(item: AttentionItem): AttentionQueueItemViewModel {
  return {
    id: `${item.reason}:${item.sourceId}`,
    subjectId: item.subjectId,
    subjectName: item.subjectName,
    subjectStatusLabel: SUBJECT_STATUS_LABELS[item.subjectStatus],
    priority: item.priority,
    priorityLabel: PRIORITY_LABELS[item.priority],
    reasonType: item.reason,
    reasonLabel: REASON_LABELS[item.reason],
    sourceStatusLabel: SOURCE_STATUS_LABELS[item.sourceStatus] ?? item.sourceStatus,
    dueDateLabel: formatDate(item.dueDate),
    ...actionFor(item),
    sourceUpdatedAt: item.sourceUpdatedAt,
  }
}

export function presentAttentionQueue(
  items: AttentionItem[]
): AttentionQueueViewModel {
  return {
    items: items.map(presentItem),
    total: items.length,
    high: items.filter((item) => item.priority === "high").length,
    medium: items.filter((item) => item.priority === "medium").length,
    low: items.filter((item) => item.priority === "low").length,
    empty: items.length === 0,
  }
}

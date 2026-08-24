import type {
  AssessmentCycle,
  AssessmentCycleStatus,
  AssessmentCycleType,
} from "../types/assessment-cycle"
import type { AssessmentResponse } from "../types/assessment-response"
import type { AssessmentViewModel } from "../view-models/assessment-view-model"

const statusLabels: Record<AssessmentCycleStatus, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  active: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
}

const typeLabels: Record<AssessmentCycleType, string> = {
  performance: "Desempenho",
  competency: "Competências",
  experience: "Experiência",
  probation: "Período de experiência",
  "360": "Avaliação 360°",
  custom: "Personalizada",
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-")

  if (!year || !month || !day) {
    return date
  }

  return `${day}/${month}/${year}`
}

function createPeriodLabel(startDate: string, endDate: string) {
  return `${formatDate(startDate)} a ${formatDate(endDate)}`
}

function getEvaluatorFormats(cycle: AssessmentCycle) {
  const formats: string[] = []

  if (cycle.allow_self_assessment) {
    formats.push("Autoavaliação")
  }

  if (cycle.allow_manager_assessment) {
    formats.push("Gestor")
  }

  if (cycle.allow_peer_assessment) {
    formats.push("Pares")
  }

  if (cycle.allow_direct_report_assessment) {
    formats.push("Liderados")
  }

  return formats
}

export function presentAssessment(
  cycle: AssessmentCycle,
  actionableResponseId: string | null = null
): AssessmentViewModel {
  return {
    id: cycle.id,
    title: cycle.name,
    description: cycle.description,
    status: cycle.status,
    statusLabel: statusLabels[cycle.status],
    typeLabel: typeLabels[cycle.assessment_type],
    periodLabel: createPeriodLabel(
      cycle.start_date,
      cycle.end_date
    ),
    startDate: cycle.start_date,
    endDate: cycle.end_date,
    templateId: cycle.assessment_template_id,
    actionableResponseId,
    isAnonymous: cycle.anonymous,
    evaluatorFormats: getEvaluatorFormats(cycle),
  }
}

export function presentAssessments(
  cycles: AssessmentCycle[],
  evaluatorResponses: AssessmentResponse[] = []
): AssessmentViewModel[] {
  const actionableResponseByCycle = new Map(
    evaluatorResponses
      .filter((response) =>
        response.status === "draft" || response.status === "in_progress"
      )
      .map((response) => [response.assessment_cycle_id, response.id])
  )

  return cycles.map((cycle) =>
    presentAssessment(
      cycle,
      actionableResponseByCycle.get(cycle.id) ?? null
    )
  )
}

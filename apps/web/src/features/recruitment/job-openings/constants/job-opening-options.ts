import {
  JOB_OPENING_EMPLOYMENT_TYPES,
  JOB_OPENING_PRIORITIES,
  JOB_OPENING_REASONS,
  JOB_OPENING_STATUSES,
  JOB_OPENING_WORK_MODELS,
} from "../types/job-opening"

import type {
  JobOpeningEmploymentType,
  JobOpeningPriority,
  JobOpeningReason,
  JobOpeningStatus,
  JobOpeningWorkModel,
} from "../types/job-opening"

export {
  JOB_OPENING_EMPLOYMENT_TYPES,
  JOB_OPENING_PRIORITIES,
  JOB_OPENING_REASONS,
  JOB_OPENING_STATUSES,
  JOB_OPENING_WORK_MODELS,
}

export const JOB_OPENING_STATUS_LABELS: Record<
  JobOpeningStatus,
  string
> = {
  draft: "Rascunho",
  pending_approval: "Aguardando aprovação",
  approved: "Aprovada",
  open: "Aberta",
  paused: "Pausada",
  closed: "Encerrada",
  cancelled: "Cancelada",
  filled: "Preenchida",
}

export const JOB_OPENING_PRIORITY_LABELS: Record<
  JobOpeningPriority,
  string
> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
}

export const JOB_OPENING_REASON_LABELS: Record<
  JobOpeningReason,
  string
> = {
  replacement: "Substituição",
  headcount_growth: "Crescimento do quadro",
  new_position: "Nova posição",
  temporary_demand: "Demanda temporária",
  internal_mobility: "Movimentação interna",
  other: "Outro",
}

export const JOB_OPENING_WORK_MODEL_LABELS: Record<
  JobOpeningWorkModel,
  string
> = {
  on_site: "Presencial",
  hybrid: "Híbrido",
  remote: "Remoto",
}

export const JOB_OPENING_EMPLOYMENT_TYPE_LABELS: Record<
  JobOpeningEmploymentType,
  string
> = {
  clt: "CLT",
  pj: "PJ",
  intern: "Estágio",
  apprentice: "Aprendiz",
  temporary: "Temporário",
  outsourced: "Terceirizado",
  contractor: "Prestador de serviço",
  other: "Outro",
}

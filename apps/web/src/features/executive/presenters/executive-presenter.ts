import {
  DecisionFeedPresenter,
  mapKPIDashboardToDecisionFeed,
} from "../decision-feed"

import type {
  ExecutiveHealthStatus,
  ExecutiveHomeDTO,
  ExecutiveHomeViewModel,
  ExecutiveNarrativeViewModel,
} from "../types"

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
})

export class ExecutivePresenter {
  present(
    dto: ExecutiveHomeDTO,
  ): ExecutiveHomeViewModel {
    const status = resolveStatus(dto)

    const alertCount = dto.dashboard.alerts.length

    const decisionFeed = new DecisionFeedPresenter().present(
      mapKPIDashboardToDecisionFeed(
        dto.dashboard,
        dto.generatedAt,
      ),
    )

    return Object.freeze({
      brief: Object.freeze({
        title: "Centro Executivo",
        description:
          "Resumo consolidado dos principais indicadores da organização.",
        status,
        statusLabel: statusLabel(status),
        generatedAtLabel: formatDate(dto.generatedAt),
        totalEmployeesLabel: dto.overview.totalEmployees.toLocaleString(
          "pt-BR",
        ),
        criticalEmployeesLabel:
          dto.overview.criticalEmployees.toLocaleString("pt-BR"),
        organizationalRisksLabel:
          dto.overview.organizationalRisks.toLocaleString("pt-BR"),
        aiSuggestionsLabel:
          dto.overview.aiSuggestions.toLocaleString("pt-BR"),
        alertCountLabel: alertCount.toLocaleString("pt-BR"),
      }),

      narrative: createNarrative(dto, status),

      decisionFeed,

      dashboard: dto.dashboard,

      isEmpty:
        dto.overview.totalEmployees === 0 &&
        dto.overview.criticalEmployees === 0 &&
        dto.overview.organizationalRisks === 0 &&
        dto.overview.aiSuggestions === 0 &&
        dto.dashboard.isEmpty,
    })
  }
}

function createNarrative(
  dto: ExecutiveHomeDTO,
  status: ExecutiveHealthStatus,
): ExecutiveNarrativeViewModel {
  const alerts = dto.dashboard.alerts.length

  return Object.freeze({
    title: "Resumo executivo",
    status,
    statusLabel: statusLabel(status),
    body: [
      `A organização possui ${dto.overview.totalEmployees} colaboradores.`,
      `${dto.overview.criticalEmployees} colaborador(es) exigem atenção imediata.`,
      `${dto.overview.organizationalRisks} risco(s) organizacional(is) foram identificados.`,
      `${alerts} alerta(s) executivo(s) ativo(s).`,
      status === "healthy"
        ? "Nenhum ponto crítico exige ação imediata."
        : "Priorize os itens destacados no Decision Feed.",
    ].join(" "),
  })
}

function resolveStatus(
  dto: ExecutiveHomeDTO,
): ExecutiveHealthStatus {
  if (
    dto.overview.criticalEmployees > 0 ||
    dto.overview.organizationalRisks > 0
  ) {
    return "critical"
  }

  if (dto.dashboard.alerts.length > 0) {
    return "attention"
  }

  return "healthy"
}

function statusLabel(
  status: ExecutiveHealthStatus,
): string {
  switch (status) {
    case "healthy":
      return "Saudável"

    case "attention":
      return "Atenção"

    case "critical":
      return "Crítico"
  }
}

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Data indisponível"
  }

  return dateFormatter.format(date)
}
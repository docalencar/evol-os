import { DecisionFeedPresenter } from "../decision-feed"

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

    const decisionFeed =
      new DecisionFeedPresenter().present(dto.decisionFeed)
    const sourceFailures = dto.sourceFailures.map((failure) =>
      Object.freeze({
        source: failure.source,
        sourceLabel: sourceLabel(failure.source),
        kind: failure.kind,
      }),
    )

    return Object.freeze({
      brief: Object.freeze({
        title: "Centro Executivo",
        description:
          "Resumo consolidado dos principais indicadores da organização.",
        status,
        statusLabel: statusLabel(status),
        generatedAtLabel: formatDate(dto.generatedAt),
        totalEmployeesLabel:
          dto.overview.totalEmployees.toLocaleString("pt-BR"),
        criticalEmployeesLabel:
          dto.overview.criticalEmployees.toLocaleString("pt-BR"),
        organizationalRisksLabel:
          dto.overview.organizationalRisks.toLocaleString("pt-BR"),
        aiSuggestionsLabel:
          dto.overview.aiSuggestions.toLocaleString("pt-BR"),
        alertCountLabel:
          alertCount.toLocaleString("pt-BR"),
      }),

      narrative: createNarrative(dto, status),

      decisionFeed,

      dashboard: dto.dashboard,

      dataStatus: sourceFailures.length > 0 ? "partial" : "complete",
      sourceFailures: Object.freeze(sourceFailures),

      isEmpty:
        dto.overview.totalEmployees === 0 &&
        dto.overview.criticalEmployees === 0 &&
        dto.overview.organizationalRisks === 0 &&
        dto.overview.aiSuggestions === 0 &&
        dto.dashboard.isEmpty &&
        decisionFeed.isEmpty &&
        sourceFailures.length === 0,
    })
  }
}

function sourceLabel(source: string): string {
  const labels: Readonly<Record<string, string>> = {
    assessments: "Avaliações",
    development: "Desenvolvimento",
    feedback: "Feedback",
    financeiro: "Financeiro",
    organization: "Organização",
    people: "Pessoas",
    workspace_unavailable: "Workspace de Planning",
    scenario_unavailable: "Cenário de Planning",
    workspace_read_failed: "Workspace de Planning",
    scenario_read_failed: "Cenários de Planning",
    "planning-timeline": "Timeline de Planning",
    recruitment: "Recrutamento",
  }

  return labels[source] ?? "Fonte executiva"
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
        : status === "partial"
          ? "A leitura executiva está incompleta; consulte as fontes indisponíveis."
          : "Priorize os itens destacados no Decision Feed.",
    ].join(" "),
  })
}

function resolveStatus(
  dto: ExecutiveHomeDTO,
): ExecutiveHealthStatus {
  if (dto.sourceFailures.length > 0) {
    return "partial"
  }

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

    case "partial":
      return "Dados parciais"
  }
}

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Data indisponível"
  }

  return dateFormatter.format(date)
}

import type {
  ExecutiveHealthStatus,
  ExecutiveHomeDTO,
  ExecutiveHomeViewModel,
} from "../types"

const statusLabels = {
  healthy: "Saudável",
  attention: "Atenção",
  critical: "Crítico",
} satisfies Record<ExecutiveHealthStatus, string>

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
})

const numberFormatter = new Intl.NumberFormat("pt-BR")

export class ExecutivePresenter {
  present(
    dto: ExecutiveHomeDTO
  ): ExecutiveHomeViewModel {
    const status = resolveStatus(dto)

    const alertCount =
      dto.overview.organizationalRisks +
      dto.dashboard.alerts.length

    return Object.freeze({
      brief: Object.freeze({
        title: "Centro Executivo",
        description:
          "Visão consolidada da organização, indicadores estratégicos e pontos que exigem atenção.",
        status,
        statusLabel: statusLabels[status],
        generatedAtLabel: formatDate(dto.generatedAt),
        totalEmployeesLabel: numberFormatter.format(
          dto.overview.totalEmployees
        ),
        criticalEmployeesLabel: numberFormatter.format(
          dto.overview.criticalEmployees
        ),
        organizationalRisksLabel: numberFormatter.format(
          dto.overview.organizationalRisks
        ),
        aiSuggestionsLabel: numberFormatter.format(
          dto.overview.aiSuggestions
        ),
        alertCountLabel: numberFormatter.format(alertCount),
      }),

      narrative: Object.freeze({
        title: "Resumo executivo",
        body: createNarrative(dto),
        status,
        statusLabel: statusLabels[status],
      }),

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

function resolveStatus(
  dto: ExecutiveHomeDTO
): ExecutiveHealthStatus {
  if (dto.overview.criticalEmployees > 0) {
    return "critical"
  }

  if (
    dto.overview.organizationalRisks > 0 ||
    dto.dashboard.alerts.length > 0
  ) {
    return "attention"
  }

  return "healthy"
}

function createNarrative(
  dto: ExecutiveHomeDTO
): string {
  const parts: string[] = []

  parts.push(
    `A organização possui ${numberFormatter.format(
      dto.overview.totalEmployees
    )} colaboradores.`
  )

  if (dto.overview.criticalEmployees > 0) {
    parts.push(
      `${numberFormatter.format(
        dto.overview.criticalEmployees
      )} colaborador(es) exigem atenção imediata.`
    )
  }

  if (dto.overview.organizationalRisks > 0) {
    parts.push(
      `${numberFormatter.format(
        dto.overview.organizationalRisks
      )} risco(s) organizacional(is) foram identificados.`
    )
  }

  if (dto.dashboard.alerts.length > 0) {
    parts.push(
      `Existem ${numberFormatter.format(
        dto.dashboard.alerts.length
      )} alerta(s) executivo(s) ativo(s).`
    )
  }

  if (
    dto.overview.criticalEmployees === 0 &&
    dto.overview.organizationalRisks === 0 &&
    dto.dashboard.alerts.length === 0
  ) {
    parts.push(
      "Nenhum ponto crítico exige ação imediata neste momento."
    )
  }

  return parts.join(" ")
}

function formatDate(
  value: string
): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Indisponível"
  }

  return dateFormatter.format(date)
}
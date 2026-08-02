import type {
  PlanningProjectionReadResult,
} from "@/features/organization-planning/application/services"
import {
  createPlanningKPIProviders,
} from "@/features/organization-planning/kpi/factories/create-planning-kpi-providers"
import type {
  PlanningKPISource,
} from "@/features/organization-planning/kpi/contracts"
import {
  PLANNING_KPI_KEYS,
  valueFor,
} from "@/features/organization-planning/kpi/providers/provider-support"

import {
  criarPainelFinanceiroExecutivo,
} from "../../services/criar-painel-financeiro-executivo"
import type {
  PainelFinanceiroExecutivo,
} from "../../types/painel-financeiro-executivo"

export type LeitorProjecaoFinanceira = Readonly<{
  execute(
    scenarioId: string,
  ): Promise<PlanningProjectionReadResult>
}>

export class ConsultaFinanceiraExecutivaService {
  constructor(
    private readonly projecao:
      LeitorProjecaoFinanceira,
  ) {}

  async executar(
    scenarioId: string,
  ): Promise<PainelFinanceiroExecutivo> {
    const resultado =
      await this.projecao.execute(scenarioId)

    const fonte = criarFonteKPI(resultado)

    const resultados = Object.freeze(
      createPlanningKPIProviders().flatMap(
        (provider) =>
          provider.calculate(fonte),
      ),
    )

    return criarPainelFinanceiroExecutivo({
      folhaAtual: valueFor(
        resultados,
        PLANNING_KPI_KEYS.currentPayroll,
      ),

      folhaPlanejada: valueFor(
        resultados,
        PLANNING_KPI_KEYS.plannedPayroll,
      ),

      quadroAtual: valueFor(
        resultados,
        PLANNING_KPI_KEYS.headcount,
      ),

      quadroAprovado: valueFor(
        resultados,
        PLANNING_KPI_KEYS.approvedHeadcount,
      ),

      quadroPlanejado: valueFor(
        resultados,
        PLANNING_KPI_KEYS.plannedHeadcount,
      ),
    })
  }
}

function criarFonteKPI(
  resultado: PlanningProjectionReadResult,
): PlanningKPISource {
  const organizacaoAtual =
    resultado.snapshot.organization

  if (!organizacaoAtual) {
    throw new Error(
      "A projeção financeira exige uma organização base.",
    )
  }

  const organizacaoPlanejada =
    resultado.execution.organization

  return Object.freeze({
    current: organizacaoAtual,
    planned: organizacaoPlanejada,

    departments:
      organizacaoPlanejada.departments,

    teams:
      organizacaoPlanejada.teams,

    positions:
      organizacaoPlanejada.positions,

    employees:
      organizacaoPlanejada.employees,

    scenario: Object.freeze({
      scenario:
        resultado.scenario.toContract(),
      events: Object.freeze([]),
    }),
  })
}

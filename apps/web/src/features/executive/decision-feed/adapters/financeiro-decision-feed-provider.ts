import {
  apresentarPainelFinanceiroExecutivo,
  type PainelFinanceiroExecutivo,
} from "@/features/financeiro-executivo"

import type { DecisionFeedProvider } from "../aggregators"
import type {
  DecisionFeedDTO,
  DecisionFeedItemDTO,
  DecisionFeedPriority,
} from "../types"

export type FonteFinanceiraExecutiva = Readonly<{
  load(): Promise<{
    scenarioId: string
    painel: PainelFinanceiroExecutivo
  }>
}>

export class FinanceiroDecisionFeedProvider
  implements DecisionFeedProvider
{
  readonly key = "financeiro"

  constructor(
    private readonly generatedAt: string,
    private readonly source: FonteFinanceiraExecutiva,
  ) {}

  async load(): Promise<DecisionFeedDTO> {
    const {
      scenarioId,
      painel,
    } = await this.source.load()

    const apresentacao =
      apresentarPainelFinanceiroExecutivo(
        painel,
      )

    const itens: DecisionFeedItemDTO[] = []

    const itemFolha = criarItemFolha({
      scenarioId,
      painel,
      apresentacao,
      generatedAt: this.generatedAt,
    })

    if (itemFolha) {
      itens.push(itemFolha)
    }

    if (
      painel.quadro.diferencaParaAprovado > 0
    ) {
      itens.push(
        criarItemQuadroAcimaDoAprovado({
          scenarioId,
          painel,
          apresentacao,
          generatedAt: this.generatedAt,
        }),
      )
    }

    const itemPlanejamento =
      criarItemVariacaoDoQuadro({
        scenarioId,
        painel,
        apresentacao,
        generatedAt: this.generatedAt,
      })

    if (itemPlanejamento) {
      itens.push(itemPlanejamento)
    }

    return Object.freeze({
      generatedAt: this.generatedAt,
      items: Object.freeze(itens),
    })
  }
}

type ContextoFinanceiro = Readonly<{
  scenarioId: string
  painel: PainelFinanceiroExecutivo
  apresentacao: ReturnType<
    typeof apresentarPainelFinanceiroExecutivo
  >
  generatedAt: string
}>

function criarItemFolha(
  contexto: ContextoFinanceiro,
): DecisionFeedItemDTO | null {
  const variacao =
    contexto.painel.folha.variacaoAbsoluta

  if (variacao === 0) {
    return null
  }

  const aumento = variacao > 0

  return Object.freeze({
    id: aumento
      ? "financeiro:aumento-folha"
      : "financeiro:reducao-folha",
    source: "financeiro",
    category: aumento
      ? "alert"
      : "recommendation",
    priority: aumento
      ? resolverPrioridadeAumentoFolha(
          contexto.painel.folha
            .variacaoPercentual,
        )
      : "low",
    title: aumento
      ? "Aumento planejado da folha"
      : "Redução planejada da folha",
    description:
      `Folha atual: ${contexto.apresentacao.folha.atual}. ` +
      `Folha planejada: ${contexto.apresentacao.folha.planejada}. ` +
      `Variação: ${contexto.apresentacao.folha.variacaoAbsoluta} ` +
      `(${contexto.apresentacao.folha.variacaoPercentual}).`,
    occurredAt: contexto.generatedAt,
    href:
      `/app/organization/planning/${contexto.scenarioId}/executive`,
    badges: Object.freeze([
      aumento
        ? "Aumento de folha"
        : "Redução de folha",
      contexto.apresentacao.folha
        .variacaoPercentual,
    ]),
  })
}

function criarItemQuadroAcimaDoAprovado(
  contexto: ContextoFinanceiro,
): DecisionFeedItemDTO {
  return Object.freeze({
    id: "financeiro:quadro-acima-aprovado",
    source: "financeiro",
    category: "alert",
    priority: "high",
    title: "Quadro acima do aprovado",
    description:
      `Quadro atual: ${contexto.apresentacao.quadro.atual}. ` +
      `Quadro aprovado: ${contexto.apresentacao.quadro.aprovado}. ` +
      `Diferença: ${contexto.apresentacao.quadro.diferencaParaAprovado}.`,
    occurredAt: contexto.generatedAt,
    href:
      `/app/organization/planning/${contexto.scenarioId}/executive`,
    badges: Object.freeze([
      "Acima do aprovado",
      contexto.apresentacao.quadro
        .diferencaParaAprovado,
    ]),
  })
}

function criarItemVariacaoDoQuadro(
  contexto: ContextoFinanceiro,
): DecisionFeedItemDTO | null {
  const diferenca =
    contexto.painel.quadro
      .diferencaParaPlanejado

  if (diferenca === 0) {
    return null
  }

  const expansao = diferenca > 0

  return Object.freeze({
    id: expansao
      ? "financeiro:expansao-quadro"
      : "financeiro:reducao-quadro",
    source: "financeiro",
    category: "recommendation",
    priority: "medium",
    title: expansao
      ? "Expansão planejada do quadro"
      : "Redução planejada do quadro",
    description:
      `Quadro atual: ${contexto.apresentacao.quadro.atual}. ` +
      `Quadro planejado: ${contexto.apresentacao.quadro.planejado}. ` +
      `Diferença: ${contexto.apresentacao.quadro.diferencaParaPlanejado}.`,
    occurredAt: contexto.generatedAt,
    href:
      `/app/organization/planning/${contexto.scenarioId}/executive`,
    badges: Object.freeze([
      expansao
        ? "Expansão planejada"
        : "Redução planejada",
      contexto.apresentacao.quadro
        .diferencaParaPlanejado,
    ]),
  })
}

function resolverPrioridadeAumentoFolha(
  variacaoPercentual: number,
): DecisionFeedPriority {
  if (variacaoPercentual >= 0.2) {
    return "critical"
  }

  if (variacaoPercentual >= 0.1) {
    return "high"
  }

  return "medium"
}

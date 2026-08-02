import type {
  PainelFinanceiroExecutivo,
  PainelFinanceiroExecutivoApresentado,
} from "../types/painel-financeiro-executivo"

const formatadorMoeda =
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  })

const formatadorPercentual =
  new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

const formatadorInteiro =
  new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  })

export function apresentarPainelFinanceiroExecutivo(
  painel: PainelFinanceiroExecutivo,
): PainelFinanceiroExecutivoApresentado {
  return Object.freeze({
    folha: Object.freeze({
      atual:
        formatadorMoeda.format(
          painel.folha.atual,
        ),

      planejada:
        formatadorMoeda.format(
          painel.folha.planejada,
        ),

      variacaoAbsoluta:
        formatarValorComSinal(
          painel.folha.variacaoAbsoluta,
          formatadorMoeda,
        ),

      variacaoPercentual:
        formatarValorComSinal(
          painel.folha.variacaoPercentual,
          formatadorPercentual,
        ),
    }),

    quadro: Object.freeze({
      atual:
        formatadorInteiro.format(
          painel.quadro.atual,
        ),

      aprovado:
        formatadorInteiro.format(
          painel.quadro.aprovado,
        ),

      planejado:
        formatadorInteiro.format(
          painel.quadro.planejado,
        ),

      diferencaParaAprovado:
        formatarValorComSinal(
          painel.quadro.diferencaParaAprovado,
          formatadorInteiro,
        ),

      diferencaParaPlanejado:
        formatarValorComSinal(
          painel.quadro.diferencaParaPlanejado,
          formatadorInteiro,
        ),
    }),
  })
}

function formatarValorComSinal(
  valor: number,
  formatador: Intl.NumberFormat,
): string {
  const valorFormatado =
    formatador.format(Math.abs(valor))

  if (valor > 0) {
    return `+${valorFormatado}`
  }

  if (valor < 0) {
    return `-${valorFormatado}`
  }

  return valorFormatado
}

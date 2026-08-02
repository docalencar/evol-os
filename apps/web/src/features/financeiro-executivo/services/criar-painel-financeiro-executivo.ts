import type {
  EntradaPainelFinanceiroExecutivo,
  PainelFinanceiroExecutivo,
} from "../types/painel-financeiro-executivo"

export function criarPainelFinanceiroExecutivo(
  entrada: EntradaPainelFinanceiroExecutivo,
): PainelFinanceiroExecutivo {
  validarNumeroNaoNegativo(
    entrada.folhaAtual,
    "folhaAtual",
  )

  validarNumeroNaoNegativo(
    entrada.folhaPlanejada,
    "folhaPlanejada",
  )

  validarInteiroNaoNegativo(
    entrada.quadroAtual,
    "quadroAtual",
  )

  validarInteiroNaoNegativo(
    entrada.quadroAprovado,
    "quadroAprovado",
  )

  validarInteiroNaoNegativo(
    entrada.quadroPlanejado,
    "quadroPlanejado",
  )

  const variacaoAbsoluta =
    entrada.folhaPlanejada -
    entrada.folhaAtual

  const variacaoPercentual =
    entrada.folhaAtual === 0
      ? 0
      : variacaoAbsoluta /
        entrada.folhaAtual

  return Object.freeze({
    folha: Object.freeze({
      atual: entrada.folhaAtual,
      planejada: entrada.folhaPlanejada,
      variacaoAbsoluta,
      variacaoPercentual,
    }),

    quadro: Object.freeze({
      atual: entrada.quadroAtual,
      aprovado: entrada.quadroAprovado,
      planejado: entrada.quadroPlanejado,

      diferencaParaAprovado:
        entrada.quadroAtual -
        entrada.quadroAprovado,

      diferencaParaPlanejado:
        entrada.quadroPlanejado -
        entrada.quadroAtual,
    }),
  })
}

function validarNumeroNaoNegativo(
  valor: number,
  campo: string,
): void {
  if (
    !Number.isFinite(valor) ||
    valor < 0
  ) {
    throw new Error(
      `${campo} deve ser um número não negativo.`,
    )
  }
}

function validarInteiroNaoNegativo(
  valor: number,
  campo: string,
): void {
  validarNumeroNaoNegativo(valor, campo)

  if (!Number.isInteger(valor)) {
    throw new Error(
      `${campo} deve ser um número inteiro.`,
    )
  }
}

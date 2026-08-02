import assert from "node:assert/strict"
import test from "node:test"

import {
  apresentarPainelFinanceiroExecutivo,
  criarPainelFinanceiroExecutivo,
} from "../index"

test("calcula a variação da folha", () => {
  const painel =
    criarPainelFinanceiroExecutivo({
      folhaAtual: 100_000,
      folhaPlanejada: 110_000,
      quadroAtual: 90,
      quadroAprovado: 100,
      quadroPlanejado: 105,
    })

  assert.equal(
    painel.folha.variacaoAbsoluta,
    10_000,
  )

  assert.equal(
    painel.folha.variacaoPercentual,
    0.1,
  )
})

test("calcula as diferenças do quadro", () => {
  const painel =
    criarPainelFinanceiroExecutivo({
      folhaAtual: 100_000,
      folhaPlanejada: 100_000,
      quadroAtual: 90,
      quadroAprovado: 100,
      quadroPlanejado: 105,
    })

  assert.equal(
    painel.quadro.diferencaParaAprovado,
    -10,
  )

  assert.equal(
    painel.quadro.diferencaParaPlanejado,
    15,
  )
})

test("usa variação percentual zero quando a folha atual é zero", () => {
  const painel =
    criarPainelFinanceiroExecutivo({
      folhaAtual: 0,
      folhaPlanejada: 10_000,
      quadroAtual: 0,
      quadroAprovado: 1,
      quadroPlanejado: 1,
    })

  assert.equal(
    painel.folha.variacaoPercentual,
    0,
  )
})

test("rejeita valores financeiros negativos", () => {
  assert.throws(
    () =>
      criarPainelFinanceiroExecutivo({
        folhaAtual: -1,
        folhaPlanejada: 10_000,
        quadroAtual: 1,
        quadroAprovado: 1,
        quadroPlanejado: 1,
      }),
    /folhaAtual deve ser um número não negativo/,
  )
})

test("rejeita valores fracionados de quadro", () => {
  assert.throws(
    () =>
      criarPainelFinanceiroExecutivo({
        folhaAtual: 10_000,
        folhaPlanejada: 10_000,
        quadroAtual: 1.5,
        quadroAprovado: 2,
        quadroPlanejado: 2,
      }),
    /quadroAtual deve ser um número inteiro/,
  )
})

test("apresenta valores em Português do Brasil", () => {
  const painel =
    criarPainelFinanceiroExecutivo({
      folhaAtual: 100_000,
      folhaPlanejada: 110_000,
      quadroAtual: 90,
      quadroAprovado: 100,
      quadroPlanejado: 105,
    })

  const apresentacao =
    apresentarPainelFinanceiroExecutivo(
      painel,
    )

  assert.match(
    apresentacao.folha.atual,
    /R\$/,
  )

  assert.equal(
    apresentacao.folha.variacaoPercentual,
    "+10,0%",
  )

  assert.equal(
    apresentacao.quadro.diferencaParaAprovado,
    "-10",
  )

  assert.equal(
    apresentacao.quadro.diferencaParaPlanejado,
    "+15",
  )
})

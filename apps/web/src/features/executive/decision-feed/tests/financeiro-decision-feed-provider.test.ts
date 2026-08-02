import assert from "node:assert/strict"
import test from "node:test"

import type {
  PainelFinanceiroExecutivo,
} from "@/features/financeiro-executivo"

import {
  FinanceiroDecisionFeedProvider,
} from "../adapters"

const generatedAt =
  "2026-08-01T12:00:00.000Z"

test("retorna feed vazio sem variações financeiras", async () => {
  const provider = criarProvider(
    criarPainel(),
  )

  const feed = await provider.load()

  assert.deepEqual(feed.items, [])
})

test("aumento de folha acima de vinte por cento é crítico", async () => {
  const provider = criarProvider(
    criarPainel({
      folha: {
        atual: 100_000,
        planejada: 125_000,
        variacaoAbsoluta: 25_000,
        variacaoPercentual: 0.25,
      },
    }),
  )

  const item = (await provider.load()).items[0]

  assert.equal(item?.source, "financeiro")
  assert.equal(item?.category, "alert")
  assert.equal(item?.priority, "critical")
  assert.match(item?.title ?? "", /Aumento/)
})

test("aumento de folha de dez por cento é prioridade alta", async () => {
  const provider = criarProvider(
    criarPainel({
      folha: {
        atual: 100_000,
        planejada: 110_000,
        variacaoAbsoluta: 10_000,
        variacaoPercentual: 0.1,
      },
    }),
  )

  const item = (await provider.load()).items[0]

  assert.equal(item?.priority, "high")
})

test("gera alerta quando o quadro está acima do aprovado", async () => {
  const provider = criarProvider(
    criarPainel({
      quadro: {
        atual: 12,
        aprovado: 10,
        planejado: 12,
        diferencaParaAprovado: 2,
        diferencaParaPlanejado: 0,
      },
    }),
  )

  const item = (await provider.load()).items[0]

  assert.equal(
    item?.id,
    "financeiro:quadro-acima-aprovado",
  )

  assert.equal(item?.priority, "high")
})

test("gera recomendação para expansão planejada", async () => {
  const provider = criarProvider(
    criarPainel({
      quadro: {
        atual: 10,
        aprovado: 15,
        planejado: 13,
        diferencaParaAprovado: -5,
        diferencaParaPlanejado: 3,
      },
    }),
  )

  const item = (await provider.load()).items[0]

  assert.equal(
    item?.id,
    "financeiro:expansao-quadro",
  )

  assert.equal(
    item?.category,
    "recommendation",
  )

  assert.equal(item?.priority, "medium")
})

test("usa o cenário no endereço da decisão", async () => {
  const provider = criarProvider(
    criarPainel({
      folha: {
        atual: 100_000,
        planejada: 105_000,
        variacaoAbsoluta: 5_000,
        variacaoPercentual: 0.05,
      },
    }),
  )

  const item = (await provider.load()).items[0]

  assert.equal(
    item?.href,
    "/app/organization/planning/scenario-1/executive",
  )
})

function criarProvider(
  painel: PainelFinanceiroExecutivo,
) {
  return new FinanceiroDecisionFeedProvider(
    generatedAt,
    {
      async load() {
        return {
          scenarioId: "scenario-1",
          painel,
        }
      },
    },
  )
}

function criarPainel(
  overrides: Partial<PainelFinanceiroExecutivo> = {},
): PainelFinanceiroExecutivo {
  return Object.freeze({
    folha: Object.freeze(
      overrides.folha ?? {
        atual: 100_000,
        planejada: 100_000,
        variacaoAbsoluta: 0,
        variacaoPercentual: 0,
      },
    ),

    quadro: Object.freeze(
      overrides.quadro ?? {
        atual: 10,
        aprovado: 10,
        planejado: 10,
        diferencaParaAprovado: 0,
        diferencaParaPlanejado: 0,
      },
    ),
  })
}

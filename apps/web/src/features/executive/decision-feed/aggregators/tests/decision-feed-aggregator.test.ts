import assert from "node:assert/strict"
import test from "node:test"

import {
  DecisionFeedAggregator,
  type DecisionFeedProvider,
} from "../decision-feed-aggregator"
import type { DecisionFeedDTO } from "../../types"

const generatedAt = "2026-08-01T12:00:00.000Z"

function createFeed(
  items: DecisionFeedDTO["items"],
): DecisionFeedDTO {
  return Object.freeze({
    generatedAt,
    items: Object.freeze(items),
  })
}

function createProvider(
  key: string,
  feed: DecisionFeedDTO,
): DecisionFeedProvider {
  return {
    key,

    async load() {
      return feed
    },
  }
}

test("agrega itens de múltiplos providers", async () => {
  const aggregator = new DecisionFeedAggregator([
    createProvider(
      "kpi",
      createFeed([
        {
          id: "kpi-alert-1",
          source: "kpi",
          category: "alert",
          priority: "high",
          title: "KPI crítico",
          description: "Indicador fora da meta.",
          occurredAt: "2026-08-01T10:00:00.000Z",
          href: "/app/indicators",
          badges: ["KPI"],
        },
      ]),
    ),

    createProvider(
      "planning",
      createFeed([
        {
          id: "planning-scenario-1",
          source: "planning",
          category: "scenario",
          priority: "medium",
          title: "Cenário atualizado",
          description: "O cenário recebeu novas alterações.",
          occurredAt: "2026-08-01T11:00:00.000Z",
          href: "/app/organization",
          badges: ["Planejamento"],
        },
      ]),
    ),
  ])

  const result = await aggregator.aggregate(generatedAt)

  assert.equal(result.feed.generatedAt, generatedAt)
  assert.deepEqual(
    result.feed.items.map((item) => item.id),
    ["kpi-alert-1", "planning-scenario-1"],
  )
  assert.deepEqual(result.failures, [])
})

test("preserva resultado parcial quando um provider falha", async () => {
  const successfulProvider = createProvider(
    "kpi",
    createFeed([
      {
        id: "kpi-alert-1",
        source: "kpi",
        category: "alert",
        priority: "high",
        title: "KPI crítico",
        description: "Indicador fora da meta.",
        occurredAt: null,
        href: "/app/indicators",
        badges: ["KPI"],
      },
    ]),
  )

  const failingProvider: DecisionFeedProvider = {
    key: "planning",

    async load() {
      throw new Error("Planning indisponível.")
    },
  }

  const aggregator = new DecisionFeedAggregator([
    successfulProvider,
    failingProvider,
  ])

  const result = await aggregator.aggregate(generatedAt)

  assert.deepEqual(
    result.feed.items.map((item) => item.id),
    ["kpi-alert-1"],
  )

  assert.deepEqual(result.failures, [
    {
      providerKey: "planning",
      message: "Planning indisponível.",
    },
  ])
})

test("remove itens duplicados preservando a primeira ocorrência", async () => {
  const firstItem = {
    id: "shared-item",
    source: "kpi" as const,
    category: "alert" as const,
    priority: "high" as const,
    title: "Primeira ocorrência",
    description: "Item vindo do primeiro provider.",
    occurredAt: null,
    href: "/app/indicators",
    badges: ["KPI"],
  }

  const secondItem = {
    ...firstItem,
    title: "Segunda ocorrência",
    description: "Item duplicado vindo do segundo provider.",
  }

  const aggregator = new DecisionFeedAggregator([
    createProvider("first", createFeed([firstItem])),
    createProvider("second", createFeed([secondItem])),
  ])

  const result = await aggregator.aggregate(generatedAt)

  assert.equal(result.feed.items.length, 1)
  assert.equal(
    result.feed.items[0]?.title,
    "Primeira ocorrência",
  )
})

test("rejeita providers com chaves duplicadas", () => {
  assert.throws(
    () =>
      new DecisionFeedAggregator([
        createProvider("kpi", createFeed([])),
        createProvider("kpi", createFeed([])),
      ]),
    /Duplicate Decision Feed provider key: kpi/,
  )
})

test("rejeita provider com chave vazia", () => {
  assert.throws(
    () =>
      new DecisionFeedAggregator([
        createProvider("   ", createFeed([])),
      ]),
    /Decision Feed provider key cannot be empty/,
  )
})

test("retorna feed vazio quando não existem providers", async () => {
  const aggregator = new DecisionFeedAggregator([])

  const result = await aggregator.aggregate(generatedAt)

  assert.deepEqual(result.feed, {
    generatedAt,
    items: [],
  })

  assert.deepEqual(result.failures, [])
})
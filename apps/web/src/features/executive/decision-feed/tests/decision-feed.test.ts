import assert from "node:assert/strict"
import test from "node:test"

import { DecisionFeedApplicationService } from "../application"
import { DecisionFeedPresenter } from "../presenters"
import {
  DecisionFeedQueryService,
  type DecisionFeedDataSource,
} from "../queries"
import type { DecisionFeedDTO } from "../types"

const dto = Object.freeze({
  generatedAt: "2026-08-01T12:00:00.000Z",
  items: Object.freeze([
    Object.freeze({
      id: "low-newer",
      source: "kpi",
      category: "execution",
      priority: "low",
      title: "Execução concluída",
      description: "Processamento concluído.",
      occurredAt: "2026-08-01T11:00:00.000Z",
      href: "/app/indicators",
      badges: Object.freeze(["Execução"]),
    }),
    Object.freeze({
      id: "critical-older",
      source: "planning",
      category: "scenario",
      priority: "critical",
      title: "Cenário crítico",
      description: "Cenário exige revisão.",
      occurredAt: "2026-08-01T09:00:00.000Z",
      href: "/app/organization",
      badges: Object.freeze(["Planejamento", "Crítico"]),
    }),
    Object.freeze({
      id: "high-newer",
      source: "kpi",
      category: "alert",
      priority: "high",
      title: "Alerta executivo",
      description: "Indicador fora da meta.",
      occurredAt: "2026-08-01T10:00:00.000Z",
      href: "/app/indicators",
      badges: Object.freeze(["Alerta"]),
    }),
  ]),
}) satisfies DecisionFeedDTO

test("Presenter ordena por prioridade e depois por data", () => {
  const feed = new DecisionFeedPresenter().present(dto)

  assert.deepEqual(
    feed.items.map((item) => item.id),
    ["critical-older", "high-newer", "low-newer"],
  )
})

test("Presenter formata labels, badges e datas", () => {
  const feed = new DecisionFeedPresenter().present(dto)
  const item = feed.items[0]

  assert.equal(item?.sourceLabel, "Planejamento")
  assert.equal(item?.categoryLabel, "Cenário")
  assert.equal(item?.priorityLabel, "Crítica")
  assert.equal(item?.badges.length, 2)
  assert.notEqual(item?.occurredAtLabel, "Data indisponível")
})

test("Presenter representa datas ausentes explicitamente", () => {
  const feed = new DecisionFeedPresenter().present({
    generatedAt: dto.generatedAt,
    items: [
      {
        ...dto.items[0],
        occurredAt: null,
      },
    ],
  })

  assert.equal(
    feed.items[0]?.occurredAtLabel,
    "Data indisponível",
  )
})

test("Query Service delega uma única leitura", async () => {
  let calls = 0

  const source: DecisionFeedDataSource = {
    async load() {
      calls += 1
      return dto
    },
  }

  const result = await new DecisionFeedQueryService(source).load()

  assert.equal(calls, 1)
  assert.equal(result, dto)
})

test("Application Service coordena query e presenter", async () => {
  const source: DecisionFeedDataSource = {
    async load() {
      return dto
    },
  }

  const application = new DecisionFeedApplicationService(
    new DecisionFeedQueryService(source),
    new DecisionFeedPresenter(),
  )

  const result = await application.execute()

  assert.equal(result.title, "Decision Feed")
  assert.equal(result.items.length, 3)
})

test("Presenter cria estado vazio", () => {
  const feed = new DecisionFeedPresenter().present({
    generatedAt: dto.generatedAt,
    items: [],
  })

  assert.equal(feed.isEmpty, true)
  assert.deepEqual(feed.items, [])
})

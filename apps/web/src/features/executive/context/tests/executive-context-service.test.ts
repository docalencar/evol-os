import assert from "node:assert/strict"
import test from "node:test"

import {
  ExecutiveContextService,
  type ExecutiveContextClock,
} from "../application"
import type {
  ExecutiveContextProvider,
  ExecutiveContextProviderResult,
} from "../providers"

const now = new Date("2026-08-01T12:00:00.000Z")

class FixedClock implements ExecutiveContextClock {
  now(): Date {
    return new Date(now.getTime())
  }
}

function createProvider(
  result: ExecutiveContextProviderResult,
): ExecutiveContextProvider {
  return {
    async load() {
      return result
    },
  }
}

test("resolve contexto completo sem warnings", async () => {
  const service = new ExecutiveContextService(
    createProvider({
      companyId: "company-1",
      workspaceId: "workspace-1",
      scenarioId: "scenario-1",
    }),
    new FixedClock(),
  )

  const resolution = await service.resolve()

  assert.deepEqual(resolution, {
    context: {
      companyId: "company-1",
      workspaceId: "workspace-1",
      scenarioId: "scenario-1",
      generatedAt: "2026-08-01T12:00:00.000Z",
    },
    warnings: [],
  })
})

test("representa workspace ausente explicitamente", async () => {
  const service = new ExecutiveContextService(
    createProvider({
      companyId: "company-1",
      workspaceId: null,
      scenarioId: "scenario-1",
    }),
    new FixedClock(),
  )

  const resolution = await service.resolve()

  assert.equal(
    resolution.context.workspaceId,
    null,
  )

  assert.deepEqual(resolution.warnings, [
    {
      code: "workspace_unavailable",
      message:
        "Nenhum workspace de planejamento está disponível para o contexto executivo.",
    },
  ])
})

test("representa cenário ausente explicitamente", async () => {
  const service = new ExecutiveContextService(
    createProvider({
      companyId: "company-1",
      workspaceId: "workspace-1",
      scenarioId: null,
    }),
    new FixedClock(),
  )

  const resolution = await service.resolve()

  assert.equal(
    resolution.context.scenarioId,
    null,
  )

  assert.deepEqual(resolution.warnings, [
    {
      code: "scenario_unavailable",
      message:
        "Nenhum cenário de planejamento está disponível para o contexto executivo.",
    },
  ])
})

test("acumula warnings quando workspace e cenário estão ausentes", async () => {
  const service = new ExecutiveContextService(
    createProvider({
      companyId: "company-1",
      workspaceId: null,
      scenarioId: null,
    }),
    new FixedClock(),
  )

  const resolution = await service.resolve()

  assert.deepEqual(
    resolution.warnings.map((warning) => warning.code),
    [
      "workspace_unavailable",
      "scenario_unavailable",
    ],
  )
})

test("usa apenas o Clock injetado para gerar timestamp", async () => {
  let calls = 0

  const clock: ExecutiveContextClock = {
    now() {
      calls += 1
      return new Date(now.getTime())
    },
  }

  const service = new ExecutiveContextService(
    createProvider({
      companyId: "company-1",
      workspaceId: "workspace-1",
      scenarioId: "scenario-1",
    }),
    clock,
  )

  const resolution = await service.resolve()

  assert.equal(calls, 1)
  assert.equal(
    resolution.context.generatedAt,
    "2026-08-01T12:00:00.000Z",
  )
})
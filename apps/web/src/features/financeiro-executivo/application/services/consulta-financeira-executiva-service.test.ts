import assert from "node:assert/strict"
import test from "node:test"

import {
  PlanningScenario,
} from "@/features/organization-planning/domain/planning-scenario"
import {
  freezeProjectedOrganization,
  type ProjectionSnapshot,
} from "@/features/organization-planning/projection/contracts"
import type {
  ScenarioExecutionResult,
} from "@/features/organization-planning/projection/execution"

import {
  ConsultaFinanceiraExecutivaService,
} from "./consulta-financeira-executiva-service"

const scenarioId = "scenario-1"

test("converte a projeção em painel financeiro executivo", async () => {
  const service =
    new ConsultaFinanceiraExecutivaService({
      async execute(
        receivedScenarioId,
      ) {
        assert.equal(
          receivedScenarioId,
          scenarioId,
        )

        const scenario =
          criarCenario()

        const current =
          criarOrganizacaoAtual()

        const planned =
          criarOrganizacaoPlanejada()

        const snapshot:
          ProjectionSnapshot =
          Object.freeze({
            id: "snapshot-1",
            companyId: "company-1",
            workspaceId: "workspace-1",
            sourceScenarioId: null,
            version: 1,
            publishedAt:
              new Date(
                "2026-01-01T00:00:00.000Z",
              ),
            kind: "baseline",
            organization: current,
          })

        const execution:
          ScenarioExecutionResult =
          Object.freeze({
            organization: planned,
            metrics: planned.metrics,
            issues: Object.freeze([]),
            warnings: Object.freeze([]),
            executedChangeSets:
              Object.freeze([]),
            generatedAt:
              new Date(
                "2026-08-01T12:00:00.000Z",
              ),
            duration: 1,
          })

        return Object.freeze({
          scenario,
          snapshot,
          changeSets: Object.freeze([]),
          execution,
        })
      },
    })

  const painel =
    await service.executar(scenarioId)

  assert.equal(
    painel.folha.atual,
    100_000,
  )

  assert.equal(
    painel.folha.planejada,
    130_000,
  )

  assert.equal(
    painel.folha.variacaoAbsoluta,
    30_000,
  )

  assert.equal(
    painel.folha.variacaoPercentual,
    0.3,
  )

  assert.equal(
    painel.quadro.atual,
    2,
  )

  assert.equal(
    painel.quadro.aprovado,
    3,
  )

  assert.equal(
    painel.quadro.planejado,
    3,
  )

  assert.equal(
    painel.quadro.diferencaParaAprovado,
    -1,
  )

  assert.equal(
    painel.quadro.diferencaParaPlanejado,
    1,
  )

  assert.equal(
    Object.isFrozen(painel),
    true,
  )
})

test("delega uma única leitura para o cenário", async () => {
  let chamadas = 0

  const service =
    new ConsultaFinanceiraExecutivaService({
      async execute() {
        chamadas += 1

        return criarResultadoMinimo()
      },
    })

  await service.executar(scenarioId)

  assert.equal(chamadas, 1)
})

function criarResultadoMinimo() {
  const scenario = criarCenario()
  const organization =
    freezeProjectedOrganization({
      departments: [],
      teams: [],
      positions: [],
      employees: [],
      vacancies: [],
      metrics: {
        headcount: 0,
        vacancies: 0,
        salaryMass: 0,
        departments: 0,
        positions: 0,
      },
    })

  return Object.freeze({
    scenario,

    snapshot: Object.freeze({
      id: "snapshot-1",
      companyId: "company-1",
      workspaceId: "workspace-1",
      sourceScenarioId: null,
      version: 1,
      publishedAt:
        new Date(
          "2026-01-01T00:00:00.000Z",
        ),
      kind: "baseline" as const,
      organization,
    }),

    changeSets: Object.freeze([]),

    execution: Object.freeze({
      organization,
      metrics: organization.metrics,
      issues: Object.freeze([]),
      warnings: Object.freeze([]),
      executedChangeSets:
        Object.freeze([]),
      generatedAt:
        new Date(
          "2026-08-01T12:00:00.000Z",
        ),
      duration: 0,
    }),
  })
}

function criarCenario(): PlanningScenario {
  return PlanningScenario.restore({
    id: scenarioId,
    companyId: "company-1",
    workspaceId: "workspace-1",
    baseSnapshotId: "snapshot-1",
    name: "Cenário Financeiro",
    description: null,
    status: "draft",
    version: 1,
    createdAt:
      new Date(
        "2026-01-01T00:00:00.000Z",
      ),
    updatedAt:
      new Date(
        "2026-01-01T00:00:00.000Z",
      ),
  })
}

function criarOrganizacaoAtual() {
  return freezeProjectedOrganization({
    departments: [],
    teams: [],
    positions: [
      criarCargo("position-1"),
      criarCargo("position-2"),
      criarCargo("position-3"),
    ],
    employees: [
      criarColaborador("employee-1"),
      criarColaborador("employee-2"),
    ],
    vacancies: [],
    metrics: {
      headcount: 2,
      vacancies: 0,
      salaryMass: 100_000,
      departments: 0,
      positions: 3,
    },
  })
}

function criarOrganizacaoPlanejada() {
  return freezeProjectedOrganization({
    departments: [],
    teams: [],
    positions: [
      criarCargo("position-1"),
      criarCargo("position-2"),
      criarCargo("position-3"),
    ],
    employees: [
      criarColaborador("employee-1"),
      criarColaborador("employee-2"),
      criarColaborador("employee-3"),
    ],
    vacancies: [],
    metrics: {
      headcount: 3,
      vacancies: 0,
      salaryMass: 130_000,
      departments: 0,
      positions: 3,
    },
  })
}

function criarCargo(id: string) {
  return {
    id,
    name: `Cargo ${id}`,
    description: null,
    departmentId: null,
    hierarchicalLevel: "analyst" as const,
    weeklyWorkloadHours: 44,
    workModel: "on_site" as const,
    employmentType: "clt" as const,
    travelRequirement: "none" as const,
    status: "active" as const,
  }
}

function criarColaborador(id: string) {
  return {
    id,
    positionId: null,
    departmentId: null,
    teamId: null,
    status: "active" as const,
  }
}

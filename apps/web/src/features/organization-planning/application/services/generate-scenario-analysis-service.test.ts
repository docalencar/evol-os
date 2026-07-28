import assert from "node:assert/strict"

import {
  describe,
  it,
} from "node:test"

import type {
  ScenarioComparisonSummary,
} from "../../comparison"

import type {
  ProjectionContract,
} from "../../projection/contracts/projection-persistence-contract"

import type {
  OrganizationSnapshot,
} from "../../snapshot"

import {
  GenerateScenarioAnalysisService,
} from "./generate-scenario-analysis-service"

class InMemoryProjectionRepository {
  constructor(
    private readonly projection:
      ProjectionContract | null
  ) {}

  async findById(
    companyId: string,
    projectionId: string
  ) {
    if (
      !this.projection ||
      this.projection.companyId !==
        companyId ||
      this.projection.id !==
        projectionId
    ) {
      return null
    }

    return this.projection
  }

  async findLatestByScenario() {
    return null
  }

  async create() {}
}

class InMemorySnapshotRepository {
  constructor(
    private readonly snapshot:
      OrganizationSnapshot | null
  ) {}

  async findById() {
    return null
  }

  async findOrganizationById(
    companyId: string,
    snapshotId: string
  ) {
    if (
      companyId !== "company-1" ||
      snapshotId !== "snapshot-1"
    ) {
      return null
    }

    return this.snapshot
  }

  async create() {}
}

function createProjection(
  overrides:
    Partial<ProjectionContract> = {}
): ProjectionContract {
  const occurredAt =
    new Date(
      "2026-07-27T12:00:00.000Z"
    )

  return {
    id:
      "projection-1",

    companyId:
      "company-1",

    workspaceId:
      "workspace-1",

    scenarioId:
      "scenario-1",

    sourceSnapshotId:
      "snapshot-1",

    version:
      1,

    status:
      "completed",

    organization: {
      departments: [
        {
          id:
            "department-1",

          name:
            "Tecnologia",

          description:
            null,

          parentDepartmentId:
            null,

          leaderId:
            null,

          archivedAt:
            null,
        },
      ],

      teams:
        [],

      positions: [
        {
          id:
            "position-1",

          name:
            "Desenvolvedor",

          description:
            null,

          departmentId:
            "department-1",

          teamId:
            null,

          reportsToPositionId:
            null,

          hierarchicalLevel:
            "specialist",

          weeklyWorkloadHours:
            40,

          workModel:
            "hybrid",

          employmentType:
            "clt",

          travelRequirement:
            "none",

          status:
            "active",

          archivedAt:
            null,
        },
      ],

      employees: [
        {
          id:
            "employee-1",

          userId:
            null,

          fullName:
            "João",

          email:
            null,

          phone:
            null,

          birthDate:
            null,

          hireDate:
            null,

          status:
            "active",

          departmentId:
            "department-1",

          teamId:
            null,

          positionId:
            "position-1",

          managerEmployeeId:
            null,

          discProfile:
            null,

          avatarUrl:
            null,

          archivedAt:
            null,
        },
      ],

      vacancies:
        [],

      metrics: {
        headcount:
          1,

        vacancies:
          0,

        salaryMass:
          0,

        departments:
          1,

        positions:
          1,
      },
    },

    metrics: {
      headcount:
        1,

      vacancies:
        0,

      salaryMass:
        0,

      departments:
        1,

      positions:
        1,
    },

    warnings:
      [],

    errors:
      [],

    manifest: {
      projectionVersion:
        1,

      engineVersion:
        "1.0.0",

      schemaVersion:
        "1.0.0",

      changeSetCount:
        0,

      executedChangeSets:
        0,

      warningCount:
        0,

      errorCount:
        0,

      durationMs:
        10,

      generatedAt:
        occurredAt,
    },

    createdAt:
      occurredAt,

    updatedAt:
      occurredAt,

    ...overrides,
  }
}

function createSnapshot():
  OrganizationSnapshot {
  return {
    schemaVersion:
      1,

    generatedAt:
      "2026-07-27T10:00:00.000Z",

    departments: [
      {
        id:
          "department-1",

        name:
          "Tecnologia",

        description:
          null,

        parentDepartmentId:
          null,

        leaderId:
          null,

        archivedAt:
          null,
      },
    ],

    teams:
      [],

    positions: [
      {
        id:
          "position-1",

        name:
          "Desenvolvedor",

        description:
          null,

        departmentId:
          "department-1",

        teamId:
          null,

        reportsToPositionId:
          null,

        hierarchicalLevel:
          "specialist",

        weeklyWorkloadHours:
          40,

        workModel:
          "hybrid",

        employmentType:
          "clt",

        travelRequirement:
          "none",

        status:
          "active",

        archivedAt:
          null,
      },
    ],

    employees: [
      {
        id:
          "employee-1",

        userId:
          null,

        fullName:
          "João",

        email:
          null,

        phone:
          null,

        birthDate:
          null,

        hireDate:
          null,

        status:
          "active",

        departmentId:
          "department-1",

        teamId:
          null,

        positionId:
          "position-1",

        managerEmployeeId:
          null,

        discProfile:
          null,

        avatarUrl:
          null,

        archivedAt:
          null,
      },
    ],
  }
}

function createComparisonSummary():
  ScenarioComparisonSummary {
  return {
    headcountDelta:
      0,

    departmentDelta:
      0,

    positionDelta:
      0,

    teamDelta:
      0,

    employeeDelta:
      0,

    vacancyDelta:
      0,

    totalChanges:
      0,
  } as ScenarioComparisonSummary
}

describe(
  "GenerateScenarioAnalysisService",
  () => {
    it(
      "gera a análise consolidada do cenário",
      async () => {
        const generatedAt =
          new Date(
            "2026-07-27T15:00:00.000Z"
          )

        const requestedComparisons:
          Array<{
            companyId: string
            scenarioId: string
          }> = []

        const service =
          new GenerateScenarioAnalysisService(
            new InMemoryProjectionRepository(
              createProjection()
            ),

            new InMemorySnapshotRepository(
              createSnapshot()
            ),

            async (
              companyId,
              scenarioId
            ) => {
              requestedComparisons.push({
                companyId,
                scenarioId,
              })

              return createComparisonSummary()
            },

            () => generatedAt
          )

        const result =
          await service.execute({
            companyId:
              "company-1",

            projectionId:
              "projection-1",
          })

        assert.equal(
          result.projectionId,
          "projection-1"
        )

        assert.equal(
          result.scenarioId,
          "scenario-1"
        )

        assert.equal(
          result.projectionVersion,
          1
        )

        assert.equal(
          result.generatedAt.toISOString(),
          "2026-07-27T15:00:00.000Z"
        )

        assert.equal(
          result.intelligence
            .workforce
            .headcount
            .current,
          1
        )

        assert.equal(
          result.intelligence
            .workforce
            .headcount
            .projected,
          1
        )

        assert.ok(
          result.structuralImpact
        )

        assert.ok(
          result.spanOfControl
        )

        assert.ok(
          result.positionCapacity
        )

        assert.ok(
          Array.isArray(
            result.insights
          )
        )

        assert.ok(
          result.executiveSummary
        )

        assert.deepEqual(
          requestedComparisons,
          [
            {
              companyId:
                "company-1",

              scenarioId:
                "scenario-1",
            },
          ]
        )
      }
    )

    it(
      "normaliza os identificadores recebidos",
      async () => {
        const service =
          new GenerateScenarioAnalysisService(
            new InMemoryProjectionRepository(
              createProjection()
            ),

            new InMemorySnapshotRepository(
              createSnapshot()
            ),

            async () =>
              createComparisonSummary()
          )

        const result =
          await service.execute({
            companyId:
              "  company-1  ",

            projectionId:
              "  projection-1  ",
          })

        assert.equal(
          result.projectionId,
          "projection-1"
        )
      }
    )

    it(
      "retorna erro quando companyId está vazio",
      async () => {
        const service =
          new GenerateScenarioAnalysisService(
            new InMemoryProjectionRepository(
              createProjection()
            ),

            new InMemorySnapshotRepository(
              createSnapshot()
            ),

            async () =>
              createComparisonSummary()
          )

        await assert.rejects(
          () =>
            service.execute({
              companyId:
                "   ",

              projectionId:
                "projection-1",
            }),
          /companyId é obrigatório/
        )
      }
    )

    it(
      "retorna erro quando projectionId está vazio",
      async () => {
        const service =
          new GenerateScenarioAnalysisService(
            new InMemoryProjectionRepository(
              createProjection()
            ),

            new InMemorySnapshotRepository(
              createSnapshot()
            ),

            async () =>
              createComparisonSummary()
          )

        await assert.rejects(
          () =>
            service.execute({
              companyId:
                "company-1",

              projectionId:
                "",
            }),
          /projectionId é obrigatório/
        )
      }
    )

    it(
      "retorna erro quando a projeção não existe",
      async () => {
        const service =
          new GenerateScenarioAnalysisService(
            new InMemoryProjectionRepository(
              null
            ),

            new InMemorySnapshotRepository(
              createSnapshot()
            ),

            async () =>
              createComparisonSummary()
          )

        await assert.rejects(
          () =>
            service.execute({
              companyId:
                "company-1",

              projectionId:
                "projection-invalid",
            }),
          /Projeção não encontrada/
        )
      }
    )

    it(
      "retorna erro quando a projeção pertence a outra empresa",
      async () => {
        const projection =
          createProjection({
            companyId:
              "company-2",
          })

        const projections = {
          async findById() {
            return projection
          },

          async findLatestByScenario() {
            return null
          },

          async create() {},
        }

        const service =
          new GenerateScenarioAnalysisService(
            projections,

            new InMemorySnapshotRepository(
              createSnapshot()
            ),

            async () =>
              createComparisonSummary()
          )

        await assert.rejects(
          () =>
            service.execute({
              companyId:
                "company-1",

              projectionId:
                "projection-1",
            }),
          /não pertence à empresa/
        )
      }
    )

    it(
      "retorna erro quando o snapshot organizacional não existe",
      async () => {
        const service =
          new GenerateScenarioAnalysisService(
            new InMemoryProjectionRepository(
              createProjection()
            ),

            new InMemorySnapshotRepository(
              null
            ),

            async () =>
              createComparisonSummary()
          )

        await assert.rejects(
          () =>
            service.execute({
              companyId:
                "company-1",

              projectionId:
                "projection-1",
            }),
          /Snapshot organizacional/
        )
      }
    )

    it(
      "não consulta a comparação quando a projeção não existe",
      async () => {
        let comparisonWasRequested =
          false

        const service =
          new GenerateScenarioAnalysisService(
            new InMemoryProjectionRepository(
              null
            ),

            new InMemorySnapshotRepository(
              createSnapshot()
            ),

            async () => {
              comparisonWasRequested =
                true

              return createComparisonSummary()
            }
          )

        await assert.rejects(
          () =>
            service.execute({
              companyId:
                "company-1",

              projectionId:
                "projection-invalid",
            }),
          /Projeção não encontrada/
        )

        assert.equal(
          comparisonWasRequested,
          false
        )
      }
    )
  }
)

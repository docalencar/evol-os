import assert from "node:assert/strict"
import { describe, it } from "node:test"

import type {
  ProjectionContract,
} from "../../projection/contracts/projection-persistence-contract"

import type {
  OrganizationSnapshot,
} from "../../snapshot"

import {
  GenerateScenarioIntelligenceService,
} from "./generate-scenario-intelligence-service"


class InMemoryProjectionRepository {
  constructor(
    private readonly projection:
      ProjectionContract | null
  ) {}

  async findById() {
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

  async findOrganizationById() {
    return this.snapshot
  }

  async create() {}
}


function createProjection(): ProjectionContract {
  return {
    id: "projection-1",
    companyId: "company-1",
    workspaceId: "workspace-1",
    scenarioId: "scenario-1",
    sourceSnapshotId: "snapshot-1",
    version: 1,
    status: "completed",

    organization: {
      departments: [],
      teams: [],
      positions: [],
      employees: [],
      vacancies: [],
      metrics: {
        headcount: 15,
        vacancies: 0,
        salaryMass: 0,
        departments: 3,
        positions: 8,
      },
    },

    metrics: {
      headcount: 15,
      vacancies: 0,
      salaryMass: 0,
      departments: 3,
      positions: 8,
    },

    warnings: [],
    errors: [],

    manifest: {
      projectionVersion: 1,
      engineVersion: "1.0.0",
      schemaVersion: "1.0.0",
      changeSetCount: 0,
      executedChangeSets: 0,
      warningCount: 0,
      errorCount: 0,
      durationMs: 10,
      generatedAt: new Date(),
    },

    createdAt: new Date(),
    updatedAt: new Date(),
  }
}


function createSnapshot(): OrganizationSnapshot {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),

    departments: [
      {
        id: "department-1",
        name: "Tecnologia",
        description: null,
        parentDepartmentId: null,
        leaderId: null,
        archivedAt: null,
      },
      {
        id: "department-2",
        name: "RH",
        description: null,
        parentDepartmentId: null,
        leaderId: null,
        archivedAt: null,
      },
    ],

    teams: [],

    positions: [
      {
        id: "position-1",
        name: "Desenvolvedor",
        description: null,
        departmentId: "department-1",
        teamId: null,
        reportsToPositionId: null,
        hierarchicalLevel: "specialist",
        weeklyWorkloadHours: 40,
        workModel: "hybrid",
        employmentType: "clt",
        travelRequirement: "none",
        status: "active",
        archivedAt: null,
      },
    ],

    employees: [
      {
        id: "employee-1",
        userId: null,
        fullName: "João",
        email: null,
        phone: null,
        birthDate: null,
        hireDate: null,
        status: "active",
        departmentId: "department-1",
        teamId: null,
        positionId: "position-1",
        managerEmployeeId: null,
        discProfile: null,
        avatarUrl: null,
        archivedAt: null,
      },
    ],
  }
}


describe(
  "GenerateScenarioIntelligenceService",
  () => {

    it(
      "gera inteligência usando snapshot base da projeção",
      async () => {
        const service =
          new GenerateScenarioIntelligenceService(
            new InMemoryProjectionRepository(
              createProjection()
            ),
            new InMemorySnapshotRepository(
              createSnapshot()
            )
          )

        const result =
          await service.execute({
            companyId: "company-1",
            projectionId: "projection-1",
          })


        assert.ok(result)

        assert.equal(
          result.workforce.headcount.current,
          1
        )
      }
    )


    it(
      "retorna erro quando projeção não existe",
      async () => {
        const service =
          new GenerateScenarioIntelligenceService(
            new InMemoryProjectionRepository(
              null
            ),
            new InMemorySnapshotRepository(
              createSnapshot()
            )
          )

        await assert.rejects(
          () =>
            service.execute({
              companyId: "company-1",
              projectionId: "invalid",
            }),
          /Projeção não encontrada/
        )
      }
    )


    it(
      "retorna erro quando snapshot não existe",
      async () => {
        const service =
          new GenerateScenarioIntelligenceService(
            new InMemoryProjectionRepository(
              createProjection()
            ),
            new InMemorySnapshotRepository(
              null
            )
          )

        await assert.rejects(
          () =>
            service.execute({
              companyId: "company-1",
              projectionId: "projection-1",
            }),
          /Snapshot organizacional/
        )
      }
    )
  }
)

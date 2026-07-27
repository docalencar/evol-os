import assert from "node:assert/strict"
import test from "node:test"

import type {
  ProjectionContract,
} from "../../../projection"
import type {
  ProjectionApplicationRepository,
} from "../projection-application-repository"
import {
  InMemoryProjectionVersionAllocator,
  RepositoryProjectionVersionAllocator,
} from "../projection-version-allocator"

const companyId = "company-1"
const scenarioId = "scenario-1"

class InMemoryProjectionRepository
  implements ProjectionApplicationRepository
{
  readonly calls: Array<{
    companyId: string
    scenarioId: string
  }> = []

  constructor(
    private readonly latestProjection:
      ProjectionContract | null
  ) {}

  async findById() {
    return null
  }

  async findLatestByScenario(
    requestedCompanyId: string,
    requestedScenarioId: string
  ) {
    this.calls.push({
      companyId:
        requestedCompanyId,
      scenarioId:
        requestedScenarioId,
    })

    return this.latestProjection
  }

  async create() {}
}

function createProjection(
  version: number
): ProjectionContract {
  const occurredAt =
    new Date(
      "2026-07-20T14:30:00.000Z"
    )

  return Object.freeze({
    id: "projection-1",
    companyId,
    workspaceId: "workspace-1",
    scenarioId,
    sourceSnapshotId: "snapshot-1",
    version,
    status: "completed",
    organization:
      Object.freeze({
        departments:
          Object.freeze([]),
        teams:
          Object.freeze([]),
        positions:
          Object.freeze([]),
        employees:
          Object.freeze([]),
        vacancies:
          Object.freeze([]),
        metrics:
          Object.freeze({
            headcount: 0,
            vacancies: 0,
            salaryMass: 0,
            departments: 0,
            positions: 0,
          }),
      }),
    metrics:
      Object.freeze({
        headcount: 0,
        vacancies: 0,
        salaryMass: 0,
        departments: 0,
        positions: 0,
      }),
    warnings:
      Object.freeze([]),
    errors:
      Object.freeze([]),
    manifest:
      Object.freeze({
        projectionVersion:
          version,
        engineVersion: "1.0.0",
        schemaVersion: "1.0.0",
        changeSetCount: 0,
        executedChangeSets: 0,
        warningCount: 0,
        errorCount: 0,
        durationMs: 10,
        generatedAt:
          new Date(
            occurredAt.getTime()
          ),
      }),
    createdAt:
      new Date(
        occurredAt.getTime()
      ),
    updatedAt:
      new Date(
        occurredAt.getTime()
      ),
  })
}

test(
  "InMemoryProjectionVersionAllocator inicia a versão em 1",
  async () => {
    const allocator =
      new InMemoryProjectionVersionAllocator()

    const version =
      await allocator.allocate(
        companyId,
        scenarioId
      )

    assert.equal(
      version,
      1
    )
  }
)

test(
  "InMemoryProjectionVersionAllocator incrementa versões do mesmo cenário",
  async () => {
    const allocator =
      new InMemoryProjectionVersionAllocator()

    const firstVersion =
      await allocator.allocate(
        companyId,
        scenarioId
      )

    const secondVersion =
      await allocator.allocate(
        companyId,
        scenarioId
      )

    const thirdVersion =
      await allocator.allocate(
        companyId,
        scenarioId
      )

    assert.deepEqual(
      [
        firstVersion,
        secondVersion,
        thirdVersion,
      ],
      [1, 2, 3]
    )
  }
)

test(
  "InMemoryProjectionVersionAllocator isola versões por empresa e cenário",
  async () => {
    const allocator =
      new InMemoryProjectionVersionAllocator()

    await allocator.allocate(
      companyId,
      scenarioId
    )

    await allocator.allocate(
      companyId,
      scenarioId
    )

    const otherCompanyVersion =
      await allocator.allocate(
        "company-2",
        scenarioId
      )

    const otherScenarioVersion =
      await allocator.allocate(
        companyId,
        "scenario-2"
      )

    const originalVersion =
      await allocator.allocate(
        companyId,
        scenarioId
      )

    assert.equal(
      otherCompanyVersion,
      1
    )

    assert.equal(
      otherScenarioVersion,
      1
    )

    assert.equal(
      originalVersion,
      3
    )
  }
)

test(
  "RepositoryProjectionVersionAllocator retorna 1 quando não existe projeção anterior",
  async () => {
    const repository =
      new InMemoryProjectionRepository(
        null
      )

    const allocator =
      new RepositoryProjectionVersionAllocator(
        repository
      )

    const version =
      await allocator.allocate(
        companyId,
        scenarioId
      )

    assert.equal(
      version,
      1
    )

    assert.deepEqual(
      repository.calls,
      [
        {
          companyId,
          scenarioId,
        },
      ]
    )
  }
)

test(
  "RepositoryProjectionVersionAllocator incrementa a versão mais recente",
  async () => {
    const repository =
      new InMemoryProjectionRepository(
        createProjection(7)
      )

    const allocator =
      new RepositoryProjectionVersionAllocator(
        repository
      )

    const version =
      await allocator.allocate(
        companyId,
        scenarioId
      )

    assert.equal(
      version,
      8
    )

    assert.deepEqual(
      repository.calls,
      [
        {
          companyId,
          scenarioId,
        },
      ]
    )
  }
)

test(
  "RepositoryProjectionVersionAllocator encaminha empresa e cenário ao repositório",
  async () => {
    const repository =
      new InMemoryProjectionRepository(
        null
      )

    const allocator =
      new RepositoryProjectionVersionAllocator(
        repository
      )

    await allocator.allocate(
      "company-99",
      "scenario-42"
    )

    assert.deepEqual(
      repository.calls,
      [
        {
          companyId:
            "company-99",
          scenarioId:
            "scenario-42",
        },
      ]
    )
  }
)
